import type { SaidText } from "../model/SaidText.js"

/**
 * Who the confidential answers of a questionnaire are for (an organisation that receives testimonies: GEIPAN), as a case template names it (see
 * CaseTemplateJson.recipient) and as the interview then keeps it (see InterviewJson.questionnaire): the key that seals them for it.
 */
export interface SealRecipient {
  /** What a sealed answer names it by (see InterviewSeal.for). */
  id: string
  name: SaidText
  /** Its public key, RSA-OAEP with SHA-256, as a JSON Web Key. Its private key never comes near UFO@home. */
  publicKey: JsonWebKey
  /** Where the testimonies it receives are sent, when it receives them by mail: what Send addresses (see QUESTIONNAIRE_SEND_EVENT). */
  email?: string
}

/**
 * An answer only its recipient can read, in place of its text: encrypted with AES-GCM by a key drawn for it alone, that key itself encrypted with the
 * recipient's public key (RSA-OAEP-256). The file can go anywhere, be shared or published: whoever holds it sees that an answer was given, and why it
 * is confidential (see InterviewRedaction), never what it is.
 */
export interface InterviewSeal {
  /** The id of the recipient it is sealed for (see SealRecipient). */
  for: string
  alg: "RSA-OAEP-256+A256GCM"
  /** The AES key, encrypted with the recipient's public key, in base64. */
  key: string
  /** The AES-GCM nonce, in base64. */
  iv: string
  /** The answer, UTF-8 encrypted with the AES key, in base64. */
  data: string
}

/** Seals answers for their recipient, and opens them for whoever holds its private key. */
export class QuestionnaireSeal {
  static readonly ALG = "RSA-OAEP-256+A256GCM"
  private static readonly RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const

  /** `text` sealed for `recipient`. */
  static async seal(text: string, recipient: SealRecipient): Promise<InterviewSeal> {
    const crypto = globalThis.crypto.subtle
    const publicKey = await crypto.importKey("jwk", recipient.publicKey, QuestionnaireSeal.RSA, false, ["encrypt"])
    const aes = await crypto.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"])
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
    const data = await crypto.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(text))
    const key = await crypto.encrypt(QuestionnaireSeal.RSA, publicKey, await crypto.exportKey("raw", aes))
    return { for: recipient.id, alg: QuestionnaireSeal.ALG, key: QuestionnaireSeal.base64(key), iv: QuestionnaireSeal.base64(iv), data: QuestionnaireSeal.base64(data) }
  }

  /** What `seal` holds, read with the recipient's private key (RSA-OAEP, SHA-256, usable to decrypt); an error when it is not that key. */
  static async open(seal: InterviewSeal, privateKey: CryptoKey): Promise<string> {
    const crypto = globalThis.crypto.subtle
    const raw = await crypto.decrypt(QuestionnaireSeal.RSA, privateKey, QuestionnaireSeal.bytes(seal.key))
    const aes = await crypto.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"])
    const text = await crypto.decrypt({ name: "AES-GCM", iv: QuestionnaireSeal.bytes(seal.iv) }, aes, QuestionnaireSeal.bytes(seal.data))
    return new TextDecoder().decode(text)
  }

  /** A key pair for a recipient: what an organisation makes once, giving its public half to the case template and keeping the other. */
  static async keyPair(): Promise<{ publicKey: JsonWebKey, privateKey: JsonWebKey }> {
    const crypto = globalThis.crypto.subtle
    const pair = await crypto.generateKey({ ...QuestionnaireSeal.RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["encrypt", "decrypt"])
    return { publicKey: await crypto.exportKey("jwk", pair.publicKey), privateKey: await crypto.exportKey("jwk", pair.privateKey) }
  }

  /** A private key as `keyPair` gave it, ready to open seals. */
  static importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return globalThis.crypto.subtle.importKey("jwk", jwk, QuestionnaireSeal.RSA, false, ["decrypt"])
  }

  private static base64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  }

  private static bytes(text: string): Uint8Array<ArrayBuffer> {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
}
