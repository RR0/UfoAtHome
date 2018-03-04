package org.rr0.im.service;

import junit.framework.TestCase;
import org.rr0.im.business.actor.HumanBeing;
import org.rr0.im.business.actor.HumanBeingImpl;
import org.rr0.im.business.actor.Identity;
import org.rr0.im.business.actor.IdentityImpl;
import org.rr0.im.business.event.TimeLine;
import org.rr0.im.business.event.circumstance.PreciseMomentImpl;
import org.rr0.im.business.evidence.AffidavitImpl;
import org.rr0.im.business.investigation.FaceToFaceInterviewImpl;
import org.rr0.im.business.investigation.FreeTextQuestionImpl;
import org.rr0.im.business.investigation.Interview;
import org.rr0.im.business.investigation.Investigation;
import org.rr0.im.business.report.*;
import org.rr0.im.service.function.AccountQuality;
import org.rr0.im.service.function.AccountQualityImpl;

/**
 * Test case for Account quality index computation.
 *
 * @author Jérôme Beau
 * @version 15 juin 2003 15:27:03
 */
public class AccountQualityTest extends TestCase {
    public AccountQualityTest(String someTestName) {
        super(someTestName);
    }

    protected void setUp() {
    }

    public void testPoorAccount() {
        Identity johnIdentity = new IdentityImpl("John Walker Smith");
        HumanBeing someOne = new HumanBeingImpl(johnIdentity);
        Source source = new AffidavitImpl("I swear I saw this thing", someOne);
        String accountText = "I saw a bright light";
        Account account = new TextAccountImpl("Poor account", source, accountText);
        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(account);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.0);
    }

    public void testVeryGoodAccount() {
        Case sampleCase = new CaseImpl("Sample case");
        Investigation investigation = new org.rr0.im.business.investigation.InvestigationImpl(sampleCase);
        Interview interview = new FaceToFaceInterviewImpl("First interview");
        investigation.getActs().add(interview);
        String accountText = "I saw a bright light";
        Account account = new TextAccountImpl("Very good account", investigation, accountText);
        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(account);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.3);
    }

    public void testMcMinnville() {
        Case sampleCase = new CaseImpl("McMinnville");
        Investigation powellInvestigation = new org.rr0.im.business.investigation.InvestigationImpl(sampleCase);
        Interview powellInterview = new FaceToFaceInterviewImpl("Powell interview");
        TimeLine powellQuestions = powellInterview.getQuestions();
        FreeTextQuestionImpl powellQuestion = new FreeTextQuestionImpl("1st question", new PreciseMomentImpl(1950, 06, 07));
        powellQuestions.add(powellQuestion);
        powellInvestigation.getActs().add(powellInterview);
        String account1 = "étaient dehors derrière la maison, et tous 2... le virent au même moment"
                + "l'objet venait vers nous et semblait être un peu incliné vers le haut. Il était très brillant — presque argenté — et il n'y avait pas de bruit ou de fumée"
                + "très brillant - presque argenté"
                + "Le Telephone Register ne se professe pas lui-même expert dans le domaines des soucoupes volantes. Cependant, au regard de la variété d'opinions et de rapports attendant aux soucoupes durant les 2 dernières années, tout effort a été fait pour vérifier l'authenticité des photos des Trent. Des experts photographes ont déclaré qu'il n'y avait eu aucune modification des négatifs. Les photos d'origine furent développées par une compagnie locale. Après un examen attentif, il n'apparaît aucune possibilité de canular ou d'hallucination lié aux photos. Par conséquent le Telephone Register les considère authentiques";
        String account2 = "non ondulant ou ni en rotation, juste une \"sorte de glissement\""
                + "s'évanouissant faiblement vers l'Ouest"
                + "brillamment métallique, de couleur argent ou aluminum, avec une touche de bronze... apparut avoir une sorte de superstructure... \"comme une canopée de parachute de bonne taille sans les filins, seulement brillant-argenté mêlé à du bronze\""
                + "il y eut une brise alors qu'il passa au-dessus... qui s'apaisa par la suite"
                + "près de vous assommer"
                + "en être un peu effrayé"
                + "craindre d'avoir des ennuis avec le \"gouvernement\" et ne pas vouloir être ennuyé par de la publicité"
                + "sur le sol sous un secrétaire où les enfants des témoins jouaient avec";
        String account3 = "[le témoin 2] élabora, \"Il n'y avait aucune flamme et il se déplaçait plutôt lentement. C'est alors que je prenais la 1ère photo. Il se déplaça un peu plus à gauche et je me déplaçais sur la droite pour prendre une autre photo.\""
                + "vous entendez tellement de trucs à propos de ces choses... Je ne croyais pas toutes ces histoires sur les soucoupes volantes avant, mais maintenant j'ai l'idée que l'Armée sait ce qu'elles sont"
                + "en être un peu effrayé";
        String account6 = "terriblement beau";
        Account account = new TextAccountImpl("McMinville account", powellInvestigation, account1);
        AccountQuality accountQuality = new AccountQualityImpl();
        double accountQualityIndex = accountQuality.getValue(account);
        System.out.println("McMinnville accountQualityIndex = " + accountQualityIndex);
        assertTrue("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.3);
        //        assertTrue ("accountQualityIndex = " + accountQualityIndex, accountQualityIndex == 0.3);
    }

    protected void tearDown() {
        // Nettoyage fin de test
    }
}
