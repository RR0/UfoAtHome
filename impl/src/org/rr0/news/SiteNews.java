package org.rr0.news;

import org.apache.commons.cli.*;
import org.apache.commons.digester.rss.Channel;
import org.apache.commons.digester.rss.Item;

import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.HTML;
import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.DTD;
import javax.swing.text.html.parser.DocumentParser;
import java.io.*;
import java.text.MessageFormat;
import java.util.*;

/**
 * Generates a set of news data given a updated set of files.
 * Generates:
 * <ul>
 * <li>RSS feeds</li>
 * <li>HTML links</li>
 * </ul>
 *
 * @author Jérôme Beau
 * @version 22 juin 2003 15:19:05
 */
public class SiteNews
{
    private String feedFilename;
    private static final String DEFAULT_PROPERTIES_FILENAME = "SiteNews.properties";
    private Properties properties;
    private List added = new ArrayList();
    private List updated = new ArrayList();
    private File propertiesFile;
    private String webFilename;
    private Locale documentsLocale;
    final String newsTag = "<div class=\"news\"/>";
    private DocumentParser htmlParser;
    private final String DEFAULT_DTD = "http://www.w3.org/TR/html4/strict.dtd";
    private Map fileTitles = new HashMap();
    private Map fileDescriptions = new HashMap();

    private static String propertiesFilenameArgument;
    private static String htmlFilenameArgument;
    private static String rssFilenameArgument;
    private static Locale localeArgument;

    private static boolean verboseArgument;
    private ResourceBundle documentsBundle;
    private static ResourceBundle toolBundle;
    private boolean verbose;
    private File filesDirectory;
    private static String directoryArgument;

    public static void main(String[] args) throws IOException, ParseException {
        toolBundle = ResourceBundle.getBundle(SiteNews.class.getName());
        try {
            parseArguments(args);
            SiteNews generator = new SiteNews(propertiesFilenameArgument, htmlFilenameArgument, rssFilenameArgument, verboseArgument, localeArgument, directoryArgument);
            generator.generate();
        } catch (UnrecognizedOptionException e) {
            System.err.println(e.getMessage());
        }
    }

    private static void parseArguments(String[] args) throws ParseException {
        Options options = new Options();
        final String HISTORY_OPTION = "history";
        final String RSS_OPTION = "rss";
        final String HTML_OPTION = "html";
        final String VERBOSE_OPTION = "verbose";
        final String LOCALE_OPTION = "language";
        final String DIRECTORY_OPTION = "directory";
        options.addOption(HTML_OPTION, true, toolMessage("htmlFileToUpdate"));
        options.addOption(RSS_OPTION, true, toolMessage("rssFileToGenerate"));
        options.addOption(HISTORY_OPTION, true, toolMessage("historyFile"));
        options.addOption(VERBOSE_OPTION, "v", false, toolMessage("verbose"));
        options.addOption(LOCALE_OPTION, true, toolMessage("documentLocale"));
        options.addOption(DIRECTORY_OPTION, "dir", true, toolMessage("documentDirectory"));
        Parser commandLineParser = new BasicParser();
        CommandLine commandLine = commandLineParser.parse(options, args);
        if (!commandLine.hasOption(RSS_OPTION) || !commandLine.hasOption(HTML_OPTION)) {
            new HelpFormatter().printHelp("java " + SiteNews.class.getName(), options);
            System.exit(-1);
        }

        propertiesFilenameArgument = commandLine.hasOption(HISTORY_OPTION) ? commandLine.getOptionValue(HISTORY_OPTION) : DEFAULT_PROPERTIES_FILENAME;
        rssFilenameArgument = commandLine.getOptionValue(RSS_OPTION);
        htmlFilenameArgument = commandLine.getOptionValue(HTML_OPTION);
        verboseArgument = commandLine.hasOption(VERBOSE_OPTION);
        directoryArgument = commandLine.getOptionValue(DIRECTORY_OPTION);
        String localeOptionValue = commandLine.getOptionValue(LOCALE_OPTION);
        StringTokenizer stringTokenizer = new StringTokenizer(localeOptionValue, "_");
        String language = stringTokenizer.nextToken();
        String country = stringTokenizer.nextToken();
        localeArgument = commandLine.hasOption(LOCALE_OPTION) ? new Locale(language, country) : Locale.getDefault();
    }

    private static String toolMessage(final String messageKey) {
        return toolBundle.getString(messageKey);
    }

    public SiteNews(String propertiesFile, String htmlFilename, String rssFilename, boolean verbose, Locale locale, String directory) throws IOException {
        this.verbose = verbose;
        readProperties(propertiesFile, directory);
        webFilename = htmlFilename;
        feedFilename = rssFilename;
        documentsLocale = locale;
        DTD htmlDTD = DTD.getDTD(DEFAULT_DTD);
        htmlParser = new DocumentParser(htmlDTD);
        documentsBundle = ResourceBundle.getBundle(getClass().getName(), documentsLocale);
    }

    private void readProperties(String propertiesFilename, String directory) {
        properties = new Properties();
        propertiesFile = new File(propertiesFilename).getAbsoluteFile();
        if (directory == null) {
            filesDirectory = propertiesFile.getParentFile();
        } else {
            filesDirectory = new File(directory);
        }
        if (!filesDirectory.isDirectory()) {
            throw new IllegalArgumentException(filesDirectory + " is not a directory");
        }
        try {
            writeInfo("readingHistory", propertiesFilename);
            InputStream fileInputStream = new FileInputStream(propertiesFile);
            properties.load(fileInputStream);
        } catch (IOException e) {
            System.err.println(e);
            propertiesFile = new File(DEFAULT_PROPERTIES_FILENAME).getAbsoluteFile();
            System.out.println("Will use " + propertiesFile.getAbsolutePath());
        }
    }

    private void generate() throws IOException {
        File[] directoryFiles = filesDirectory.listFiles();
        writeVerbose("filesFound", filesDirectory.getName(), String.valueOf(directoryFiles.length));
        analyze(directoryFiles);

        if (feedFilename != null) {
            Channel feed = generateFeed();
            writeFeed(feed);
        }

        List lines = readWeb();
        writeWeb(lines);

        updateProperties(directoryFiles);
    }

    private void analyze(File[] directoryFiles) {
        for (int i = 0; i < directoryFiles.length; i++) {
            File currentFile = directoryFiles[i];
            String currentFileLastModified = (String) properties.get(currentFile.getName());
            if (currentFileLastModified == null) {
                added.add(currentFile);
                writeVerbose("fileHasBeenAdded", currentFile.getName());
            } else {
                long lastUpdated = Long.valueOf(currentFileLastModified).longValue();
                if (lastUpdated != currentFile.lastModified()) {
                    updated.add(currentFile);
                    writeVerbose("fileHasBeenUpdated", currentFile.getName());
                }
            }
        }
    }

    private Channel generateFeed() throws IOException {
        Channel channel = new Channel();
        try {
            channel.setCopyright(documentMessage("rss.copyright"));
        } catch (MissingResourceException e) {
            // Don't set the property
        }
        try {
            channel.setDescription(documentMessage("rss.description"));
        } catch (MissingResourceException e) {
            // Don't set the property
        }
        try {
            channel.setLink(documentMessage("rss.link"));
        } catch (MissingResourceException e) {
            // Don't set the property
        }
        try {
            channel.setTitle(documentMessage("rss.title"));
        } catch (MissingResourceException e) {
            // Don't set the property
        }
        channel.setLanguage(documentsLocale.getLanguage());
        processFeed(added, channel, documentMessage("rss.added"));
        processFeed(updated, channel, documentMessage("rss.updated"));
        return channel;
    }

    private void processFeed(List toProcess, Channel channel, String prefix) throws IOException {
        Iterator iterator = toProcess.iterator();
        while (iterator.hasNext()) {
            File file = (File) iterator.next();
            String title = getTitle(file);
            String description = getDescription(file);
            Item addedItem = new Item();
            addedItem.setTitle(title);
            addedItem.setDescription(prefix + " " + description);
            final String channelLink = documentMessage("rss.link");
            if (channelLink != null) {
                addedItem.setLink(channelLink + "/" + file.getName());
            }
            channel.addItem(addedItem);
        }
    }

    private void writeFeed(Channel feed) throws IOException {
        File file = new File(feedFilename);
        FileOutputStream fileOutputStream = new FileOutputStream(file);
        writeInfo("writingFeed", feedFilename);
        feed.render(fileOutputStream);
        fileOutputStream.close();
    }

    private List readWeb() throws IOException {
        List lines = null;
        if (webFilename != null) {
            writeInfo("readingWeb", webFilename);
            BufferedReader bufferedReader = new BufferedReader(new FileReader(webFilename));
            try {
                lines = new ArrayList();
                while (bufferedReader.ready()) {
                    String line = bufferedReader.readLine();

                    int linePos = line.indexOf(newsTag);
                    if (linePos >= 0) {
                        StringBuffer webBuffer = new StringBuffer();
                        processWeb(added, webBuffer, documentMessage("html.added"));
                        processWeb(updated, webBuffer, documentMessage("html.updated"));
                        if (feedFilename != null) {
                            webBuffer.append(" <a href=\"" + feedFilename + "\"><img src=\"xml.png\" width=\"36\" height=\"14\" border=\"0\"></a>");
                        }
                        webBuffer.insert(0, line.substring(0, linePos));
                        webBuffer.append(line.substring(linePos + newsTag.length()));
                        line = webBuffer.toString();
                    }

                    lines.add(line);
                }
            } finally {
                bufferedReader.close();
            }
        }
        return lines;
    }

    private void writeWeb(List lines) throws IOException {
        if (webFilename != null) {
            writeInfo("writingWeb", webFilename);
            PrintWriter printWriter = new PrintWriter(new FileWriter(webFilename));
            try {
                Iterator linesIterator = lines.iterator();
                while (linesIterator.hasNext()) {
                    String line = (String) linesIterator.next();
                    printWriter.println(line);
                }
            } finally {
                printWriter.close();
            }
        }
    }

    private void processWeb(List toProcess, StringBuffer webBuffer, String description) throws IOException {
        Iterator iterator = toProcess.iterator();
        String SEPARATOR = description + " ";
        while (iterator.hasNext()) {
            File file = (File) iterator.next();
            String title = getTitle(file);
            webBuffer.append(SEPARATOR)
                    .append("<div class=\"item\">")
                    .append("<a class=\"link\" href=\"" + file.getName() + "\">")
                    .append("<span class=\"title\">").append(title).append("</span>")
                    .append("</a>")
                    .append("</div>");
            SEPARATOR = ", ";
        }
    }

    private String getDescription(File file) {
        return (String) fileDescriptions.get(file);
    }

    /**
         * Read informations about a file.
         * HTML files are parsed to find values for <pre>&lt;title&gt;</pre> and <pre>&lt;meta&gt;</pre> data.
         *
         * @param file
         * @return
         * @throws IOException
         */
    private String getTitle(File file) throws IOException {
        String title = (String) fileTitles.get(file);
        if (title == null) {
            String filename = file.getName();
            String description = null;
            if (filename.endsWith(".html") || filename.endsWith(".htm")) {
                FileReader fileReader = new FileReader(file);
                try {
                    boolean ignoreCharSet = false;
                    final HTMLParserCallBack htmlParserCallback = new HTMLParserCallBack();
                    htmlParser.parse(fileReader, htmlParserCallback, ignoreCharSet);
                    title = htmlParserCallback.getTitle();
                    description = htmlParserCallback.getDescription();
                } finally {
                    fileReader.close();
                }
            }
            if (title == null) {
                int dotPos = filename.lastIndexOf(".");
                if (dotPos > 0) {
                    filename = filename.substring(0, dotPos);
                }
                title = filename;
            }
            if (description == null) {
                description = title;
            }
            writeVerbose("fileAttributes", filename, title, description);
            fileTitles.put(file, title);
            fileDescriptions.put(file, description);
        }
        return title;
    }

    private void updateProperties(File[] directoryFiles) throws IOException {
        properties.clear();
        for (int i = 0; i < directoryFiles.length; i++) {
            File directoryFile = directoryFiles[i];
            properties.setProperty(directoryFile.getName(), String.valueOf(directoryFile.lastModified()));
        }

        OutputStream fileOutputStream = new FileOutputStream(propertiesFile);
        writeInfo("writingHistory", propertiesFile.getAbsolutePath());
        properties.store(fileOutputStream, "Files of " + propertiesFile.getAbsolutePath());
    }

    class HTMLParserCallBack extends HTMLEditorKit.ParserCallback
    {
        private String title;
        private final String TITLE_ELEMENT = "title";
        private final String META_ELEMENT = "meta";
        private final String META_NAME_ATTRIBUTE = "name";
        private final String META_DESCRIPTION_NAME = "description";
        private final String META_CONTENT_ATTRIBUTE = "content";
        private String description;

        public String getDescription() {
            return description;
        }

        public String getTitle() {
            return title;
        }

        public void handleStartTag(HTML.Tag tag, MutableAttributeSet attributeSet, int pos) {
            if (TITLE_ELEMENT.equals(tag.toString())) {
                title = "";
            } else if (META_ELEMENT.equals(tag.toString())) {
                HTML.Attribute nameAttribute = HTML.getAttributeKey(META_NAME_ATTRIBUTE);
                String metaName = (String) attributeSet.getAttribute(nameAttribute);
                if (META_DESCRIPTION_NAME.equals(metaName)) {
                    HTML.Attribute contentAttribute = HTML.getAttributeKey(META_CONTENT_ATTRIBUTE);
                    description = (String) attributeSet.getAttribute(contentAttribute);
                    description = cleanText(description);
                }
            }
        }

        public void handleText(char[] data, int pos) {
            if (title.equals("")) {
                title = new String(data);
                title = cleanText(title);
            }
        }

        private String cleanText(String someString) {
            String[][] specialChars = {
                            {"&nbsp;", " "},
                            {"&eacute;", "é"}
            };
            for (int i = 0; i < specialChars.length; i++) {
                final String specialChar = specialChars[i][0];
                int specialCharPos = someString.indexOf(specialChar);
                if (specialCharPos >= 0) {
                    someString = someString.substring(0, specialCharPos) + specialChars[i][1] + someString.substring(specialCharPos + specialChar.length());
                }
            }
            someString = someString.trim();
            return someString;
        }
    }

    private static void writeInfo(String messageKey, Object messageParam) {
        System.out.println(toolMessage(messageKey, messageParam));
    }

    private void writeVerbose(String messageKey, String messageParam) {
        if (verbose) {
            System.out.println(toolMessage(messageKey, messageParam));
        }
    }

    private void writeVerbose(String messageKey, String messageParam0, String messageParam1) {
        if (verbose) {
            System.out.println(toolMessage(messageKey, messageParam0, messageParam1));
        }
    }

    private void writeVerbose(String messageKey, Object messageParam0, Object messageParam1, Object messageParam2) {
        if (verbose) {
            System.out.println(toolMessage(messageKey, messageParam0, messageParam1, messageParam2));
        }
    }

    private static String toolMessage(String messageKey, Object messageParam) {
        return MessageFormat.format(toolBundle.getString(messageKey), new Object[]{messageParam});
    }

    private static String toolMessage(String messageKey, Object messageParam0, Object messageParam1) {
        return MessageFormat.format(toolBundle.getString(messageKey), new Object[]{messageParam0, messageParam1});
    }

    private String toolMessage(String messageKey, Object messageParam0, Object messageParam1, Object messageParam2) {
        return MessageFormat.format(toolBundle.getString(messageKey), new Object[]{messageParam0, messageParam1, messageParam2});
    }

    private String documentMessage(final String messageKey) {
        return documentsBundle.getString(messageKey);
    }
}
