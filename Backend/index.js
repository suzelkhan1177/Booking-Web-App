
const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
(async () => {
  try {
    await db.collection("test").doc("hello").set({ foo: "bar" });
    console.log("✅ Firestore write succeeded");
  } catch (err) {
    console.error("❌ Firestore error:", err);
  }
})();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 8001;
const SLOT_INTERVAL = 30; 
const START_HOUR = 9; 
const END_HOUR = 18; 

function generateSlots(dateStr) {
  const slots = [];
  let hour = START_HOUR;
  let minute = 0;

  while (hour < END_HOUR || (hour === END_HOUR && minute === 0)) {
    const timeStr =
      String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    slots.push(timeStr);

    minute += SLOT_INTERVAL;
    if (minute >= 60) {
      minute = 0;
      hour++;
    }
    if (hour >= END_HOUR) break;
  }
  return slots;
}

app.get("/api/v1/slots/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!date) return res.status(400).json({ error: "Missing date parameter" });

    const allSlots = generateSlots(date);
    const snapshot = await db
      .collection("bookings")
      .where("date", "==", date)
      .get();

    const bookedSlots = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        time: data.time,
        userId: data.userId || null,
        name: data.name || null,
      };
    });

    const bookedTimes = bookedSlots.map((b) => b.time);
    const available = allSlots.filter((s) => !bookedTimes.includes(s));

    res.json({ date, available, booked: bookedSlots });
  } catch (err) {
    console.error("❌ Error fetching slots:", err);
    res.status(500).json({ error: "Server error" });
  }
});

function generateUserId() {
  return (
    "U" +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

app.post("/api/v1/book", async (req, res) => {
  try {
    let { date, time, userId, name } = req.body;


    if (!date || !time || !name) {
      return res
        .status(400)
        .json({ error: "Missing fields (date, time, name required)" });
    }

    if (!userId) {
      userId = generateUserId();
    }

    const allSlots = generateSlots(date);
    if (!allSlots.includes(time)) {
      return res.status(400).json({ error: "Invalid slot" });
    }

    const docId = `${date}_${time}`;
    const bookingRef = db.collection("bookings").doc(docId);

    await db.runTransaction(async (t) => {
      const doc = await t.get(bookingRef);
      if (doc.exists) {
        throw new Error("Slot already booked");
      }
      t.set(bookingRef, {
        date,
        time,
        userId,
        name,
        bookingDateTime: `${date} ${time}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.status(201).json({
      ok: true,
      message: "Booked successfully",
      booking: { id: docId, date, time, userId, name },
    });
  } catch (err) {
    if (err.message === "Slot already booked") {
      return res.status(409).json({ ok: false, error: err.message });
    }
    console.error("❌ Booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
