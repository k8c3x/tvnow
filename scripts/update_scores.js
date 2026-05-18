import admin from "firebase-admin";
import fs from "fs";
import axios from "axios";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearCollection(name) {
  const snapshot = await db.collection(name).get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

async function updateScores() {
  console.log("Fetching 365Scores...");

  const url =
    "https://webws.365scores.com/web/games/allscores/?appTypeId=5&langId=9&timezoneName=Asia%2FBaghdad&userCountryId=114&sports=1&showOdds=true&onlyMajorGames=true&withTop=true";

  const response = await axios.get(url);
  const games = response.data.games || [];

  await clearCollection("live_matches");

  const batch = db.batch();

  for (const game of games) {
    const ref = db.collection("live_matches").doc(String(game.id));

    batch.set(ref, {
      matchId: game.id,
      homeTeamName: game.homeCompetitor?.name || "",
      awayTeamName: game.awayCompetitor?.name || "",
      homeScore: game.homeCompetitor?.score || 0,
      awayScore: game.awayCompetitor?.score || 0,
      minute: game.gameTimeDisplay || "",
      matchStatus: game.statusText || "",
      leagueName: game.competitionDisplayName || "",
      startTime: game.startTime || "",
      homeTeamLogo: game.homeCompetitor?.imagePath || "",
      awayTeamLogo: game.awayCompetitor?.imagePath || "",
    });
  }

  await batch.commit();

  console.log(`Updated ${games.length} matches.`);
}

updateScores()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
