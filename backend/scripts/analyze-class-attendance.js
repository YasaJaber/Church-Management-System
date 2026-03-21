const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function analyzeClassAttendance() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = mongoose.connection.db;
    
    // Show all classes
    const classes = await db.collection('classes').find({}).toArray();
    console.log('🏫 Available Classes:');
    classes.forEach((cls, idx) => {
      console.log(`   ${idx + 1}. ${cls.name} (ID: ${cls._id})`);
    });
    console.log('');
    
    // Get last 4 Fridays
    const last4Fridays = [];
    let current = new Date();
    let daysChecked = 0;
    while (last4Fridays.length < 4 && daysChecked < 60) {
      if (current.getDay() === 5) { // Friday
        last4Fridays.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() - 1);
      daysChecked++;
    }
    last4Fridays.reverse(); // Oldest to newest
    console.log('📅 Last 4 Fridays:', last4Fridays.join(' → '));
    console.log('');
    
    // Analyze each class
    for (const classData of classes) {
      console.log('═'.repeat(100));
      console.log(`📚 Class: ${classData.name}`);
      console.log('═'.repeat(100));
      
      const children = await db.collection('children').find({
        class: classData._id,
        isActive: true
      }).sort({ name: 1 }).toArray();
      
      if (children.length === 0) {
        console.log('   ⚠️  No active children in this class\n');
        continue;
      }
      
      console.log(`👶 Total children: ${children.length}\n`);
      
      // Track statistics
      let childrenWith0Weeks = 0;
      let childrenWith1Week = 0;
      let childrenWith2Weeks = 0;
      let childrenWith3Weeks = 0;
      let childrenWith4Weeks = 0;
      
      const childrenDetails = [];
      
      for (const child of children) {
        // Get last gift/reset
        const lastGift = await db.collection('giftdeliveries').findOne(
          { child: child._id, isActive: true },
          { sort: { deliveryDate: -1 } }
        );
        
        const lastResetDate = lastGift 
          ? new Date(lastGift.deliveryDate).toISOString().split('T')[0]
          : null;
        
        // Get attendance for last 4 Fridays
        const attendanceRecords = await db.collection('attendances').find({
          person: child._id,
          type: 'child',
          date: { $in: last4Fridays }
        }).sort({ date: 1 }).toArray();
        
        // Create attendance map
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
          attendanceMap[record.date] = record.status;
        });
        
        // Filter Fridays after reset
        const fridaysAfterReset = last4Fridays.filter(friday => {
          return !lastResetDate || friday > lastResetDate;
        });
        
        // Count consecutive present weeks from most recent
        let consecutivePresent = 0;
        for (let i = fridaysAfterReset.length - 1; i >= 0; i--) {
          const friday = fridaysAfterReset[i];
          if (attendanceMap[friday] === 'present') {
            consecutivePresent++;
          } else {
            break; // Stop at first absence or missing record
          }
        }
        
        // Categorize
        if (consecutivePresent === 0) childrenWith0Weeks++;
        else if (consecutivePresent === 1) childrenWith1Week++;
        else if (consecutivePresent === 2) childrenWith2Weeks++;
        else if (consecutivePresent === 3) childrenWith3Weeks++;
        else if (consecutivePresent >= 4) childrenWith4Weeks++;
        
        childrenDetails.push({
          name: child.name,
          consecutiveWeeks: consecutivePresent,
          lastReset: lastResetDate || 'Never',
          attendance: last4Fridays.map(f => attendanceMap[f] || '?').join(' | ')
        });
      }
      
      // Show statistics
      console.log('📊 Consecutive Weeks Distribution:');
      console.log(`   0 weeks: ${childrenWith0Weeks} children`);
      console.log(`   1 week:  ${childrenWith1Week} children`);
      console.log(`   2 weeks: ${childrenWith2Weeks} children`);
      console.log(`   3 weeks: ${childrenWith3Weeks} children`);
      console.log(`   4+ weeks: ${childrenWith4Weeks} children (eligible for gift!)`);
      console.log('');
      
      // Show sample children (first 5)
      console.log('📋 Sample Children (first 5):');
      childrenDetails.slice(0, 5).forEach(child => {
        console.log(`   ${child.name}:`);
        console.log(`      Consecutive weeks: ${child.consecutiveWeeks}`);
        console.log(`      Last reset: ${child.lastReset}`);
        console.log(`      Attendance (${last4Fridays[0]} to ${last4Fridays[3]}): ${child.attendance}`);
      });
      console.log('');
      
      // Show children with 4 weeks
      if (childrenWith4Weeks > 0) {
        console.log(`🏆 Children eligible for gift (${childrenWith4Weeks}):`);
        childrenDetails
          .filter(c => c.consecutiveWeeks >= 4)
          .slice(0, 10)
          .forEach(child => {
            console.log(`   ✅ ${child.name} (${child.consecutiveWeeks} weeks)`);
          });
        if (childrenWith4Weeks > 10) {
          console.log(`   ... and ${childrenWith4Weeks - 10} more`);
        }
      }
      console.log('');
    }
    
    console.log('═'.repeat(100));
    console.log('✅ Analysis complete!');
    console.log('═'.repeat(100));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

analyzeClassAttendance();
