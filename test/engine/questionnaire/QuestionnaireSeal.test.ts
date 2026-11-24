// @vitest-environment node
import { describe, expect, it } from "vitest"
import { QuestionnaireSeal } from "../../../src/engine/questionnaire/QuestionnaireSeal.js"
import { QuestionnaireTemplates } from "../../../src/engine/questionnaire/QuestionnaireTemplate.js"
import { CaseTemplates } from "../../../src/engine/questionnaire/CaseTemplate.js"
import form from "../../fixtures/questionnaires/sighting-form.json"
import type { QuestionnaireTemplate } from "../../../src/engine/questionnaire/QuestionnaireTemplate.js"

QuestionnaireTemplates.add(form as QuestionnaireTemplate)

describe("QuestionnaireSeal", () => {
  it("seals an answer that only the recipient's private key opens, each answer with a key of its own", async () => {
    const { publicKey, privateKey } = await QuestionnaireSeal.keyPair()
    const recipient = { id: "org", name: { en: "The organisation" }, publicKey }
    const sealed = await QuestionnaireSeal.seal("12 rue des Lilas, Cussac", recipient)
    expect(sealed).toMatchObject({ for: "org", alg: "RSA-OAEP-256+A256GCM" })
    expect(JSON.stringify(sealed)).not.toContain("Lilas")
    expect(await QuestionnaireSeal.open(sealed, await QuestionnaireSeal.importPrivateKey(privateKey))).toBe("12 rue des Lilas, Cussac")
    const again = await QuestionnaireSeal.seal("12 rue des Lilas, Cussac", recipient)
    expect(again.key).not.toBe(sealed.key)
    const other = await QuestionnaireSeal.keyPair()
    await expect(QuestionnaireSeal.open(sealed, await QuestionnaireSeal.importPrivateKey(other.privateKey))).rejects.toThrow()
  }, 30000)

  it("writes a confidential answer taken out, its reason said and its text sealed, never in clear", async () => {
    const template = (await QuestionnaireTemplates.load("sighting-form"))!
    const { publicKey } = await QuestionnaireSeal.keyPair()
    const recipient = { id: "org", name: "The organisation", publicKey }
    const json = QuestionnaireTemplates.interview(template, {}, recipient)
    expect(json.questionnaire?.recipient?.id).toBe("org")
    const reason = QuestionnaireTemplates.field(template, "Q1")!.confidential!.reason
    QuestionnaireTemplates.answer(json, "Q1", "12 rue des Lilas", undefined, { reason, sealed: await QuestionnaireSeal.seal("12 rue des Lilas", recipient) })
    const answer = json.segments.find(segment => segment.field === "Q1" && segment.speaker === "witness")!
    expect(answer.text).toBeUndefined()
    expect(answer.redacted?.reason).toMatchObject({ en: "Precise address" })
    expect(answer.redacted?.sealed?.for).toBe("org")
    expect(JSON.stringify(json)).not.toContain("Lilas")
    expect(QuestionnaireTemplates.answerOf(json, "Q1")).toBeUndefined()
  }, 30000)

  it("takes from a case template the recipient's public key only, and refuses one that gives its private key", async () => {
    const { publicKey, privateKey } = await QuestionnaireSeal.keyPair()
    const template = CaseTemplates.check({ format: 1, id: "g", title: "G", recipient: { id: "org", name: "The organisation", publicKey }, starts: [{ id: "qt", title: "QT", questionnaires: ["sighting-form"] }] }, "https://g.example/t.json")
    expect(template.starts[0].recipient).toMatchObject({ id: "org", publicKey: { kty: "RSA", n: publicKey.n, e: publicKey.e } })
    expect(() => CaseTemplates.check({ format: 1, id: "g", title: "G", recipient: { id: "org", name: "The organisation", publicKey: privateKey }, starts: [{ id: "qt", title: "QT" }] }, "https://g.example/t.json"))
      .toThrow(/private key/)
  }, 30000)
})
