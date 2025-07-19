const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

// Import models
const Attendance = require("./backend/models/Attendance");

const MONGODB_URI =
  "mongodb+srv://yasamasry:Yasa_jaber12345@marygerges.f7mwc5q.mongodb.net/margerges_church?retryWrites=true&w=majority&appName=maryGerges";

async function cleanupDuplicates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all attendance records
    const allRecords = await Attendance.find({}).sort({ person: 1, date: 1 });
    console.log(`📊 Found ${allRecords.length} total attendance records`);

    // Group by person + date + type
    const groupedRecords = {};

    allRecords.forEach((record) => {
      const key = `${record.person}_${
        record.date.toISOString().split("T")[0]
      }_${record.type}`;

      if (!groupedRecords[key]) {
        groupedRecords[key] = [];
      }
      groupedRecords[key].push(record);
    });

    // Find duplicates
    let duplicatesCount = 0;
    let recordsToDelete = [];

    Object.entries(groupedRecords).forEach(([key, records]) => {
      if (records.length > 1) {
        console.log(`🔍 Found ${records.length} duplicates for key: ${key}`);
        duplicatesCount += records.length - 1;

        // Keep the latest record (last one), delete the rest
        const sortedRecords = records.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        const recordsToKeep = sortedRecords.slice(0, 1);
        const recordsToRemove = sortedRecords.slice(1);

        recordsToDelete.push(...recordsToRemove.map((r) => r._id));
      }
    });

    console.log(`🗑️  Will delete ${duplicatesCount} duplicate records`);

    if (duplicatesCount > 0) {
      // Delete duplicates
      const deleteResult = await Attendance.deleteMany({
        _id: { $in: recordsToDelete },
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate records`);
    }

    // Show final count
    const finalCount = await Attendance.countDocuments();
    console.log(`📊 Final attendance records count: ${finalCount}`);

    console.log("🧹 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

cleanupDuplicates();
