const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function inspectResetDates() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = mongoose.connection.db;
    
    // Get sample reset records
    const sampleResets = await db.collection('giftdeliveries').find({
      giftType: "إعادة تعيين عداد المواظبة",
      isActive: true
    }).sort({ deliveryDate: -1 }).limit(10).toArray();
    
    console.log('🔍 Inspecting reset date formats:');
    console.log('');
    
    sampleResets.forEach((reset, idx) => {
      console.log(`Record ${idx + 1}:`);
      console.log(`   deliveryDate value: ${reset.deliveryDate}`);
      console.log(`   Type: ${typeof reset.deliveryDate}`);
      console.log(`   Constructor: ${reset.deliveryDate?.constructor?.name}`);
      if (reset.deliveryDate instanceof Date) {
        console.log(`   ISO String: ${reset.deliveryDate.toISOString()}`);
        console.log(`   Date only: ${reset.deliveryDate.toISOString().split('T')[0]}`);
      }
      console.log('');
    });
    
    // Try to find with different date formats
    console.log('🔍 Trying different date query formats:');
    console.log('');
    
    // Try 1: Date object
    const count1 = await db.collection('giftdeliveries').countDocuments({
      giftType: "إعادة تعيين عداد المواظبة",
      deliveryDate: new Date('2026-02-27'),
      isActive: true
    });
    console.log(`   Date object '2026-02-27': ${count1} records`);
    
    // Try 2: String YYYY-MM-DD
    const count2 = await db.collection('giftdeliveries').countDocuments({
      giftType: "إعادة تعيين عداد المواظبة",
      deliveryDate: '2026-02-27',
      isActive: true
    });
    console.log(`   String '2026-02-27': ${count2} records`);
    
    // Try 3: Date range for Feb 27
    const startOfDay = new Date('2026-02-27T00:00:00Z');
    const endOfDay = new Date('2026-02-28T00:00:00Z');
    const count3 = await db.collection('giftdeliveries').countDocuments({
      giftType: "إعادة تعيين عداد المواظبة",
      deliveryDate: { $gte: startOfDay, $lt: endOfDay },
      isActive: true
    });
    console.log(`   Date range Feb 27 (full day): ${count3} records`);
    
    // Get all unique dates
    const allDates = await db.collection('giftdeliveries').distinct('deliveryDate', {
      giftType: "إعادة تعيين عداد المواظبة",
      isActive: true
    });
    
    console.log('');
    console.log(`📅 All unique delivery dates (${allDates.length} total):`);
    const sortedDates = allDates.map(d => {
      if (d instanceof Date) {
        return d.toISOString().split('T')[0];
      }
      return d.toString();
    }).sort().reverse();
    
    sortedDates.slice(0, 10).forEach(date => {
      console.log(`   - ${date}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

inspectResetDates();
