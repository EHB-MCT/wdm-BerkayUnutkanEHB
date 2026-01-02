# Transfer Swipe ✨

Transfer Swipe is een user-facing webapplicatie waarin gebruikers voetbalgeruchten beoordelen door te swipen (👍 of 👎).  
Op basis van hun interacties wordt gedragsdata verzameld, geanalyseerd en gebruikt om de gebruikerservaring subtiel te beïnvloeden.

Het project toont hoe snel gebruikers geprofileerd kunnen worden op basis van kleine, ogenschijnlijk onschuldige acties.

---

## Up & running 🏃‍➡️

Dit project draait volledig lokaal via Docker.

### Vereisten

- Docker
- Docker Compose

### Setup

1. Clone deze repository
2. Ga naar de root van het project (waar `docker-compose.yml` staat)
3. Maak een `.env` bestand aan op basis van `.env.template`
4. Start het project:

```bash
docker compose up --build
```

### URLs

Frontend (user-facing app): http://localhost:5173

Admin dashboard: http://localhost:5174

Backend API: http://localhost:3000

Er zijn geen login-gegevens nodig.

### Sources 🗃️

Transfermarkt https://www.transfermarkt.com.tr
Gebruikt als conceptuele inspiratie voor voetbalgeruchten en gebruikersgedrag
(geen code overgenomen)

Docker Documentation https://docs.docker.com/get-started/  
Gebruikt voor Docker Compose
Bestanden: docker-compose.yml, Dockerfile

ChatGPT conversation (Transfer Swipe Algemeen, zijn meestal toegepast bij elke bestand)
Link: https://chatgpt.com/share/6957b7a5-0190-800c-9614-21c30570332d

ChatGPT conversation (Docker - Backend (gelijkaardig met eerste link, tijdens de chat werd er een tak gemaakt))
Link: https://chatgpt.com/share/6957bd5a-6490-800c-a96f-edf57c20ff75

ChatGPT conversation (Backend setup)
Link: https://chatgpt.com/share/6957ca1b-a098-800c-afbe-919c371da9b1

ChatGPT conversation (Rumours data)
Link: https://chatgpt.com/share/6957ca80-b108-800c-a4c6-26d602fd3bdd
