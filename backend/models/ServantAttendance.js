const mongoose = require('mongoose');

const ServantAttendanceSchema = new mongoose.Schema({
  servantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'excused'],
    required: true,
    default: 'absent'
  },
  notes: {
    type: String,
    trim: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// إنشاء مؤشر مركب للبحث السريع
ServantAttendanceSchema.index({ servantId: 1, date: 1 }, { unique: true });
ServantAttendanceSchema.index({ date: 1, status: 1 });
ServantAttendanceSchema.index({ servantId: 1, status: 1 }); // لإحصائيات الخادم الفردية
ServantAttendanceSchema.index({ markedBy: 1, date: 1 }); // لمعرفة من سجل الحضور

// إضافة middleware للتأكد من صحة التاريخ
ServantAttendanceSchema.pre('save', function() {
  // التأكد من أن التاريخ بصيغة YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(this.date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
});

// Virtual للحصول على معلومات الخادم
ServantAttendanceSchema.virtual('servant', {
  ref: 'User',
  localField: 'servantId',
  foreignField: '_id',
  justOne: true
});

// Virtual للحصول على معلومات من قام بالتسجيل
ServantAttendanceSchema.virtual('marker', {
  ref: 'User',
  localField: 'markedBy',
  foreignField: '_id',
  justOne: true
});

// تمكين virtuals في JSON
ServantAttendanceSchema.set('toJSON', { virtuals: true });
ServantAttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ServantAttendance', ServantAttendanceSchema);
