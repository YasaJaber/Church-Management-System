const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Class = require('./models/Class');

async function assignServantsToClasses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all servants and classes
    const servants = await User.find({ role: 'servant' }).select('name phone');
    const classes = await Class.find({ name: { $ne: 'الفصل التجريبي' } }).select('name stage grade servants');
    
    console.log(`Found ${servants.length} servants and ${classes.length} classes`);
    
    // توزيع الخدام على الفصول
    const assignments = [
      // حضانة
      { servantNames: ['ابانوب شنوده', 'توماس عاطف'], className: 'حضانة' },
      // ابتدائي
      { servantNames: ['كاترين وديع', 'عدلي بداري'], className: 'أولى ابتدائي' },
      { servantNames: ['انيس عاطف', 'باخوم منير'], className: 'ثانية ابتدائي' },
      { servantNames: ['لويز صفي', 'مارينا ويصا'], className: 'ثالثة ابتدائي' },
      { servantNames: ['مهرائيل ويصا', 'كيرلس صفي'], className: 'رابعة ابتدائي' },
      { servantNames: ['توماس سامي', 'دميانه جابر'], className: 'خامسة ابتدائي' },
      { servantNames: ['مينا وليم', 'بيشوي ملاك'], className: 'سادسة ابتدائي' },
      // إعدادي وثانوي
      { servantNames: ['دميانه ناجح', 'جومانا مدحت', 'كيرلس بداري'], className: 'إعدادي' },
      { servantNames: ['تهاني روماني', 'مريم صفي', 'مريم رفعت', 'مارينا رفعت', 'ساره ندهي'], className: 'ثانوي' },
    ];
    
    for (const assignment of assignments) {
      const classObj = classes.find(c => c.name === assignment.className);
      if (!classObj) {
        console.log(`❌ Class not found: ${assignment.className}`);
        continue;
      }
      
      console.log(`\n🏫 Assigning servants to class: ${assignment.className}`);
      
      for (const servantName of assignment.servantNames) {
        const servant = servants.find(s => s.name === servantName);
        if (!servant) {
          console.log(`❌ Servant not found: ${servantName}`);
          continue;
        }
        
        // Method 1: Set assignedClass in User model
        await User.findByIdAndUpdate(servant._id, { assignedClass: classObj._id });
        
        // Method 2: Add servant to servants array in Class model
        if (!classObj.servants.includes(servant._id)) {
          classObj.servants.push(servant._id);
        }
        
        console.log(`✅ ${servantName} -> ${assignment.className}`);
      }
      
      // Save the class with updated servants
      await classObj.save();
    }
    
    console.log('\n📊 Assignment completed successfully!');
    
    // Show final results
    const updatedClasses = await Class.find({ name: { $ne: 'الفصل التجريبي' } })
      .populate('servants', 'name')
      .select('name servants');
    
    console.log('\n📋 Final assignments:');
    updatedClasses.forEach(cls => {
      const servantNames = cls.servants.map(s => s.name).join(', ') || 'None';
      console.log(`${cls.name}: ${servantNames}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

assignServantsToClasses();
