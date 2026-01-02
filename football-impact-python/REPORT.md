# Written Part – Outcomes, Shortcomings & Insights

**Project:** Transfer Swipe  
**Student:** Berkay Unutkan

## Wat is de applicatie?

Transfer Swipe is een user-facing webapplicatie waarin gebruikers voetbalgeruchten beoordelen door middel van een swipe-actie (👍 of 👎).  
Het concept is geïnspireerd op mijn eigen ervaring met voetbalwebsites zoals Transfermarkt, waar tijdens de transferperiode voortdurend geruchten verschijnen en supporters hier vaak snel en emotioneel op reageren.

Vanuit dit idee heb ik een applicatie gebouwd waarin de gebruiker ogenschijnlijk enkel transfers beoordeelt, terwijl op de achtergrond continu gedragsdata wordt verzameld.  
De frontend is opgebouwd met een component-based structuur in JSX en communiceert met een backend die alle acties opslaat en analyseert.

## Verzamelde data en profiling

Bij elke gebruiker wordt automatisch een unieke UID aangemaakt. Op basis daarvan verzamel ik onder andere:

- stemgedrag (up/down)
- bekeken clubs en competities
- hoe vaak geruchten getoond worden
- de tijd die een gebruiker nodig heeft om een beslissing te nemen
- sessie- en navigatiegedrag

Deze data wordt persistent opgeslagen in een MongoDB-database en in de backend gebruikt om per gebruiker een profiel op te bouwen.  
Op basis van dit profiel krijgt de gebruiker een eenvoudige persona, zoals _impulsief_, _neutraal_ of _kritisch_.

## Beïnvloeding van de gebruiker

De opgebouwde profielen worden gebruikt om de gebruikerservaring subtiel te beïnvloeden.  
Afhankelijk van het profiel worden bepaalde clubs vaker getoond, worden titels neutraler of clickbait-achtiger gepresenteerd en krijgt de gebruiker kleine hints te zien.

Deze beïnvloeding gebeurt zonder dat de gebruiker hier expliciet over geïnformeerd wordt.

## Shortcomings van de data

Hoewel het systeem veel data verzamelt, is deze data niet volledig betrouwbaar.  
Een lange reactietijd wordt geïnterpreteerd als twijfel, maar kan evengoed het gevolg zijn van afleiding of multitasking. Stemgedrag kan willekeurig of ironisch zijn en zegt niet altijd iets over echte overtuigingen.

Daarnaast ontbreekt context volledig: het systeem registreert enkel acties, niet de motivatie erachter.  
De persona’s zijn daardoor vereenvoudigingen en kunnen een vertekend beeld geven van de gebruiker.

## Pitfalls

Een belangrijk probleem is dat het systeem gebruikers kan vastzetten in hun bestaande voorkeuren.  
Als een gebruiker vaak op dezelfde clubs of types geruchten stemt, krijgt hij automatisch meer van hetzelfde te zien. Hierdoor krijgt de gebruiker een eenzijdig beeld en worden andere perspectieven minder zichtbaar.

Daarnaast gebeurt deze beïnvloeding zonder dat de gebruiker zich daar echt bewust van is.  
De applicatie lijkt neutraal, maar stuurt het gedrag subtiel op de achtergrond. Dit roept ethische vragen op over transparantie en manipulatie.

Ook al worden gebruikers enkel herkend via een anonieme UID, toch kan er na verloop van tijd een duidelijk gedragsprofiel opgebouwd worden.  
Dit toont aan dat anonimiteit relatief is en dat zelfs beperkte data al privacygevoelig kan zijn.

Tot slot is er het risico dat data verkeerd geïnterpreteerd wordt.  
Een administrator ziet cijfers en statistieken, maar kent de context achter het gedrag niet. Hierdoor kunnen er foutieve conclusies worden getrokken op basis van onvolledige of misleidende data.

## Wat heb ik geleerd?

Dit project heeft mij doen inzien hoe weinig data er nodig is om al een vorm van profilering en beïnvloeding toe te passen.  
Kleine interacties blijken verrassend veel te zeggen wanneer ze gecombineerd en geanalyseerd worden.
Daarnaast heb ik geleerd dat technische keuzes nooit losstaan van ethische gevolgen.  
Op technisch vlak heb ik veel bijgeleerd over het werken met een frontend-backend-architectuur, Docker en persistente databases.
