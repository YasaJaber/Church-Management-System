require('dotenv').config();
const Child = require('./models/Child');
const Class = require('./models/Class');

const assignClassesToChildren = async () => {
  try {
    // الاتصال بالداتابيس
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // الحصول على الفصول المتاحة
    const classes = await Class.find();
    console.log('📚 Available classes:', classes.map(c => c.name));
    
    // الحصول على الأطفال الذين ليس لديهم فصل
    const childrenWithoutClass = await Child.find({ class: { $exists: false } });
    console.log(`👶 Found ${childrenWithoutClass.length} children without class`);
    
    // توزيع الأطفال على الفصول بشكل عشوائي للاختبار
    let updates = [];
    for (let i = 0; i < childrenWithoutClass.length; i++) {
      const child = childrenWithoutClass[i];
      const randomClass = classes[i % classes.length];
      
      updates.push({
        childName: child.name,
        assignedClass: randomClass.name,
        classId: randomClass._id
      });
      
      // تحديث الطفل
      await Child.findByIdAndUpdate(child._id, { class: randomClass._id });
      
      if (i < 10) { // طباعة أول 10 فقط
        console.log(`✅ ${child.name} assigned to ${randomClass.name}`);
      }
    }
    
    console.log(`🎯 Updated ${updates.length} children with classes`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
};

assignClassesToChildren();
