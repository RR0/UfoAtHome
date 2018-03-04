package org.rr0.im.service.function;

import org.rr0.im.business.evidence.Affidavit;
import org.rr0.im.business.evidence.Article;
import org.rr0.im.business.evidence.Broadcast;
import org.rr0.im.business.evidence.Document;
import org.rr0.im.business.investigation.*;
import org.rr0.im.business.report.Account;
import org.rr0.im.business.report.Source;

import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Vector;
import java.util.Enumeration;

/**
 * Account quality computation, indicating the "strength" that a report has for analysis
 * based on how it was acquired.
 *
 * @author Ballester-Guasp (MUFON Spain) for specification. Thanks to Terry Groff for publishing it.
 * @author Jerome Beau for implementation.
 * @version $revision$
 */
public class AccountQualityImpl implements AccountQuality
{
    /**
         * Return the quality index of a given Account
         *
         * @param someAccount The report to check quality for.
         * @return A value between zero and one (percentage).
         */
    public double getValue(Account someAccount) {
        double qualityIndex = 0;
        Source accountSource = someAccount.getSource();
        if (accountSource instanceof Investigation) {
            Investigation accountInvestigation = (Investigation) accountSource;
            if (accountInvestigation instanceof DirectInvestigation) {
                if (accountInvestigation instanceof OnSiteInvestigation) {
                    if (accountInvestigation.getDuration().getHours() >= 2.0) {
                        qualityIndex = 1.0;
                    } else {
                        qualityIndex = 0.9;
                    }
                } else {
                    List acts = accountInvestigation.getActs();
                    Iterator actIterator = acts.iterator();
                    double averageQuality = 0.0;
                    double interviewCount = 0;
                    while (actIterator.hasNext()) {
                        InvestigationAct investigationAct = (InvestigationAct) actIterator.next();
                        if (investigationAct instanceof FaceToFaceInterview) {
                            if (investigationAct.getDuration().getHours() >= 1.0) {
                                averageQuality += 0.9;
                                interviewCount++;
                            } else {
                                averageQuality += 0.8;
                                interviewCount++;
                            }
                        } else {
                            if (investigationAct instanceof TelephoneInterview) {
                                if (investigationAct.getDuration().getHours() >= 0.5) {
                                    averageQuality += 0.7;
                                    interviewCount++;
                                } else {
                                    averageQuality += 0.6;
                                    interviewCount++;
                                }
                            }
                        }
                    }
                    qualityIndex = averageQuality / interviewCount;
                }
            } else if (accountSource instanceof IndirectInvestigation) {

            } else if (accountSource instanceof Document) {
                Locale locale = Locale.US; // TODO(jbe) Iterate on available locales
                if (accountSource instanceof Affidavit) {
                    Affidavit affidavit = (Affidavit) accountSource;
                    int wordCount = affidavit.getWordCount(locale);
                    if (wordCount >= 500) {
                        qualityIndex = 0.4;
                    } else {
                        qualityIndex = 0.3;
                    }
                } else if (accountSource instanceof Article) {
                    Article newspaperArticle = (Article) accountSource;
                    int wordCount = newspaperArticle.getWordCount(locale);
                    if (wordCount >= 500) {
                        qualityIndex = 0.2;
                    } else {
                        qualityIndex = 0.1;
                    }
                }
            } else if (accountSource instanceof Broadcast) {
                qualityIndex = 0.1;
            }
        }
        return qualityIndex;
    }

    public String getName() {
        return "AccountQuality";
    }
}
