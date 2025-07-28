import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// إعداد كيفية عرض الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// قاعدة بيانات الآيات الكتابية
const BIBLE_VERSES = [
  {
    verse: "أَحَبَّنَا اللهُ هَكَذَا حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ، لِكَيْ لاَ يَهْلِكَ كُلُّ مَنْ يُؤْمِنُ بِهِ بَلْ تَكُونُ لَهُ الْحَيَاةُ الأَبَدِيَّةُ",
    reference: "يوحنا ٣: ١٦"
  },
  {
    verse: "تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ",
    reference: "متى ١١: ٢٨"
  },
  {
    verse: "أَنَا هُوَ الطَّرِيقُ وَالْحَقُّ وَالْحَيَاةُ. لَيْسَ أَحَدٌ يَأْتِي إِلَى الآبِ إِلاَّ بِي",
    reference: "يوحنا ١٤: ٦"
  },
  {
    verse: "لاَ تَخَفْ لأَنِّي مَعَكَ. لاَ تَتَلَفَّتْ لأَنِّي إِلهُكَ. قَدْ أَيَّدْتُكَ وَأَعَنْتُكَ وَعَضَدْتُكَ بِيَمِينِ بِرِّي",
    reference: "إشعياء ٤١: ١٠"
  },
  {
    verse: "اطْلُبُوا أَوَّلاً مَلَكُوتَ اللهِ وَبِرَّهُ، وَهذِهِ كُلُّهَا تُزَادُ لَكُمْ",
    reference: "متى ٦: ٣٣"
  },
  {
    verse: "كُلُّ شَيْءٍ أَسْتَطِيعُ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي",
    reference: "فيلبي ٤: ١٣"
  },
  {
    verse: "أَحْمَدُ الرَّبَّ فِي كُلِّ حِينٍ. دَائِماً تَسْبِيحُهُ فِي فَمِي",
    reference: "مزمور ٣٤: ١"
  },
  {
    verse: "الرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ",
    reference: "مزمور ٢٣: ١"
  },
  {
    verse: "فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ",
    reference: "يوحنا ١: ١"
  },
  {
    verse: "أَمَّا كُلُّ الَّذِينَ قَبِلُوهُ فَأَعْطَاهُمْ سُلْطَاناً أَنْ يَصِيرُوا أَوْلاَدَ اللهِ، أَيِ الْمُؤْمِنُونَ بِاسْمِهِ",
    reference: "يوحنا ١: ١٢"
  },
  {
    verse: "هأَنَذَا وَاقِفٌ عَلَى الْبَابِ وَأَقْرَعُ. إِنْ سَمِعَ أَحَدٌ صَوْتِي وَفَتَحَ الْبَابَ، أَدْخُلُ إِلَيْهِ وَأَتَعَشَّى مَعَهُ وَهُوَ مَعِي",
    reference: "رؤيا ٣: ٢٠"
  },
  {
    verse: "لِكُلِّ شَيْءٍ زَمَانٌ، وَلِكُلِّ أَمْرٍ تَحْتَ السَّمَاوَاتِ وَقْتٌ",
    reference: "جامعة ٣: ١"
  },
  {
    verse: "اخْتَبِرُوا وَانْظُرُوا مَا أَطْيَبَ الرَّبَّ! طُوبَى لِلرَّجُلِ الَّذِي يَحْتَمِي بِهِ",
    reference: "مزمور ٣٤: ٨"
  },
  {
    verse: "فَرِحِينَ فِي الرَّجَاءِ، صَابِرِينَ فِي الضِّيقِ، مُواظِبِينَ عَلَى الصَّلاَةِ",
    reference: "رومية ١٢: ١٢"
  },
  {
    verse: "أَنَا نُورُ الْعَالَمِ. مَنْ يَتْبَعْنِي فَلاَ يَمْشِي فِي الظُّلْمَةِ بَلْ يَكُونُ لَهُ نُورُ الْحَيَاةِ",
    reference: "يوحنا ٨: ١٢"
  },
  {
    verse: "لاَ تَقْلَقُوا بِشَأْنِ شَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلاَةِ وَالدُّعَاءِ مَعَ الشُّكْرِ، لِتُعْلَمْ طَلِبَاتُكُمْ لَدَى اللهِ",
    reference: "فيلبي ٤: ٦"
  },
  {
    verse: "اَلْمَحَبَّةُ تَتَأَنَّى وَتَرْفُقُ. الْمَحَبَّةُ لاَ تَحْسِدُ. الْمَحَبَّةُ لاَ تَتَفَاخَرُ، وَلاَ تَنْتَفِخُ",
    reference: "كورنثوس الأولى ١٣: ٤"
  },
  {
    verse: "أَحِبُّوا أَعْدَاءَكُمْ، بَارِكُوا لاَعِنِيكُمْ، أَحْسِنُوا إِلَى مُبْغِضِيكُمْ، وَصَلُّوا لأَجْلِ الَّذِينَ يُسِيئُونَ إِلَيْكُمْ وَيَطْرُدُونَكُمْ",
    reference: "متى ٥: ٤٤"
  },
  {
    verse: "وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعاً لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ",
    reference: "رومية ٨: ٢٨"
  },
  {
    verse: "طُوبَى لِلْحَزَانَى، لأَنَّهُمْ يَتَعَزَّوْنَ",
    reference: "متى ٥: ٤"
  },
  {
    verse: "اَلسَّلاَمُ أَتْرُكُ لَكُمْ. سَلاَمِي أُعْطِيكُمْ. لَيْسَ كَمَا يُعْطِي الْعَالَمُ أُعْطِيكُمْ أَنَا",
    reference: "يوحنا ١٤: ٢٧"
  },
  {
    verse: "اُلْقِ عَلَى الرَّبِّ هَمَّكَ فَهُوَ يَعُولُكَ. لاَ يَدَعُ الصِّدِّيقَ يَتَزَعْزَعُ إِلَى الأَبَدِ",
    reference: "مزمور ٥٥: ٢٢"
  },
  {
    verse: "طُوبَى لِلْمَسَاكِينِ بِالرُّوحِ، لأَنَّ لَهُمْ مَلَكُوتَ السَّمَاوَاتِ",
    reference: "متى ٥: ٣"
  },
  {
    verse: "أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي",
    reference: "فيلبي ٤: ١٣"
  },
  {
    verse: "صَلُّوا بِلاَ انْقِطَاعٍ",
    reference: "تسالونيكي الأولى ٥: ١٧"
  },
  {
    verse: "وَإِنْ كَانَ أَحَدُكُمْ يُعْوِزُهُ حِكْمَةٌ، فَلْيَطْلُبْ مِنَ اللهِ الَّذِي يُعْطِي الْجَمِيعَ بِسَخَاءٍ وَلاَ يُعَيِّرُ، فَسَيُعْطَى لَهُ",
    reference: "يعقوب ١: ٥"
  },
  {
    verse: "أَمَّا أَنَا فَقَدْ أَتَيْتُ لِتَكُونَ لَهُمْ حَيَاةٌ وَلِيَكُونَ لَهُمْ أَفْضَلُ",
    reference: "يوحنا ١٠: ١٠"
  },
  {
    verse: "لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ",
    reference: "يوحنا ٣: ١٦"
  },
  {
    verse: "وَالآنَ يَثْبُتُ الإِيمَانُ وَالرَّجَاءُ وَالْمَحَبَّةُ، هذِهِ الثَّلاَثَةُ وَلكِنَّ أَعْظَمَهُنَّ الْمَحَبَّةُ",
    reference: "كورنثوس الأولى ١٣: ١٣"
  },
  {
    verse: "اشْكُرُوا فِي كُلِّ شَيْءٍ، لأَنَّ هذِهِ هِيَ مَشِيئَةُ اللهِ فِي الْمَسِيحِ يَسُوعَ مِنْ جِهَتِكُمْ",
    reference: "تسالونيكي الأولى ٥: ١٨"
  },
  {
    verse: "إِنْ اعْتَرَفْنَا بِخَطَايَانَا فَهُوَ أَمِينٌ وَعَادِلٌ، حَتَّى يَغْفِرَ لَنَا خَطَايَانَا وَيُطَهِّرَنَا مِنْ كُلِّ إِثْمٍ",
    reference: "يوحنا الأولى ١: ٩"
  },
  // آيات التقوى والإيمان
  {
    verse: "الرَّبُّ نُورِي وَخَلاَصِي، مِمَّنْ أَخَافُ؟ الرَّبُّ حِصْنُ حَيَاتِي، مِمَّنْ أَرْتَعِبُ؟",
    reference: "مزمور ٢٧: ١"
  },
  {
    verse: "ثِقُوا أَنَا قَدْ غَلَبْتُ الْعَالَمَ",
    reference: "يوحنا ١٦: ٣٣"
  },
  {
    verse: "اَلرَّبُّ يُحَارِبُ عَنْكُمْ وَأَنْتُمْ تَصْمُتُونَ",
    reference: "خروج ١٤: ١٤"
  },
  {
    verse: "إِنَّ اللهَ لَمْ يُعْطِنَا رُوحَ الْفَشَلِ، بَلْ رُوحَ الْقُوَّةِ وَالْمَحَبَّةِ وَالنُّصْحِ",
    reference: "تيموثاوس الثانية ١: ٧"
  },
  {
    verse: "مَنْ يُقِرُّ بِي قُدَّامَ النَّاسِ أُقِرُّ أَنَا أَيْضاً بِهِ قُدَّامَ أَبِي الَّذِي فِي السَّمَاوَاتِ",
    reference: "متى ١٠: ٣٢"
  },
  // آيات الصلاة والعبادة
  {
    verse: "وَمَتَى صَلَّيْتَ فَادْخُلْ إِلَى مِخْدَعِكَ وَأَغْلِقْ بَابَكَ، وَصَلِّ إِلَى أَبِيكَ الَّذِي فِي الْخَفَاءِ",
    reference: "متى ٦: ٦"
  },
  {
    verse: "كُلُّ مَا تَطْلُبُونَهُ فِي الصَّلاَةِ مُؤْمِنِينَ تَنَالُونَهُ",
    reference: "متى ٢١: ٢٢"
  },
  {
    verse: "تَعَالَوْا إِلَيَّ نَتَفَاكَرْ، يَقُولُ الرَّبُّ. إِنْ كَانَتْ خَطَايَاكُمْ كَالْقِرْمِزِ تَبْيَضُّ كَالثَّلْجِ",
    reference: "إشعياء ١: ١٨"
  },
  {
    verse: "اطْلُبُوا الرَّبَّ مَا دَامَ يُوجَدُ. ادْعُوهُ وَهُوَ قَرِيبٌ",
    reference: "إشعياء ٥٥: ٦"
  },
  {
    verse: "قَرِيبٌ هُوَ الرَّبُّ لِكُلِّ الَّذِينَ يَدْعُونَهُ، لِكُلِّ الَّذِينَ يَدْعُونَهُ بِالْحَقِّ",
    reference: "مزمور ١٤٥: ١٨"
  },
  // آيات الخدمة والتضحية
  {
    verse: "مَنْ أَرَادَ أَنْ يَكُونَ فِيكُمْ أَوَّلاً فَلْيَكُنْ لِلْجَمِيعِ عَبْداً",
    reference: "مرقس ١٠: ٤٤"
  },
  {
    verse: "لَيْسَ حُبٌّ أَعْظَمُ مِنْ هذَا: أَنْ يَضَعَ أَحَدٌ نَفْسَهُ لأَجْلِ أَحِبَّائِهِ",
    reference: "يوحنا ١٥: ١٣"
  },
  {
    verse: "كَمَا أَرْسَلَنِي الآبُ أُرْسِلُكُمْ أَنَا",
    reference: "يوحنا ٢٠: ٢١"
  },
  {
    verse: "اذْهَبُوا إِلَى الْعَالَمِ أَجْمَعَ وَاكْرِزُوا بِالإِنْجِيلِ لِلْخَلِيقَةِ كُلِّهَا",
    reference: "مرقس ١٦: ١٥"
  },
  {
    verse: "مَنْ يَخْدِمْنِي فَلْيَتْبَعْنِي، وَحَيْثُ أَكُونُ أَنَا هُنَاكَ أَيْضاً يَكُونُ خَادِمِي",
    reference: "يوحنا ١٢: ٢٦"
  },
  // آيات التوبة والغفران
  {
    verse: "تُوبُوا وَارْجِعُوا لِتُمْحَى خَطَايَاكُمْ، لِكَيْ تَأْتِيَ أَوْقَاتُ الْفَرَجِ مِنْ وَجْهِ الرَّبِّ",
    reference: "أعمال ٣: ١٩"
  },
  {
    verse: "قَلْباً نَظِيفاً اخْلُقْ فِيَّ يَا اللهُ، وَرُوحاً مُسْتَقِيماً جَدِّدْ فِي دَاخِلِي",
    reference: "مزمور ٥١: ١٠"
  },
  {
    verse: "إِنْ كَانَ أَحَدٌ فِي الْمَسِيحِ فَهُوَ خَلِيقَةٌ جَدِيدَةٌ. الأَشْيَاءُ الْعَتِيقَةُ قَدْ مَضَتْ، هُوَذَا الْكُلُّ قَدْ صَارَ جَدِيداً",
    reference: "كورنثوس الثانية ٥: ١٧"
  },
  {
    verse: "كَمَا بَعُدَ الْمَشْرِقُ مِنَ الْمَغْرِبِ أَبْعَدَ عَنَّا مَعَاصِيَنَا",
    reference: "مزمور ١٠٣: ١٢"
  },
  // آيات الصبر والاحتمال
  {
    verse: "صَابِرِينَ فِي الضِّيقِ، مُواظِبِينَ عَلَى الصَّلاَةِ",
    reference: "رومية ١٢: ١٢"
  },
  {
    verse: "طُوبَى لِلرَّجُلِ الَّذِي يَحْتَمِلُ التَّجْرِبَةَ، لأَنَّهُ إِذَا تَزَكَّى يَنَالُ إِكْلِيلَ الْحَيَاةِ",
    reference: "يعقوب ١: ١٢"
  },
  {
    verse: "وَلْنَجْرِ بِالصَّبْرِ فِي الْجِهَادِ الْمَوْضُوعِ أَمَامَنَا",
    reference: "عبرانيين ١٢: ١"
  },
  {
    verse: "فَإِنَّ خِفَّةَ ضِيقَتِنَا الْوَقْتِيَّةَ تُنْشِئُ لَنَا أَكْثَرَ فَأَكْثَرَ ثِقَلَ مَجْدٍ أَبَدِيّاً",
    reference: "كورنثوس الثانية ٤: ١٧"
  },
  // آيات الفرح والتسبيح
  {
    verse: "افْرَحُوا فِي الرَّبِّ كُلَّ حِينٍ وَأَقُولُ أَيْضاً افْرَحُوا",
    reference: "فيلبي ٤: ٤"
  },
  {
    verse: "هذَا هُوَ الْيَوْمُ الَّذِي صَنَعَهُ الرَّبُّ، نَبْتَهِجُ وَنَفْرَحُ فِيهِ",
    reference: "مزمور ١١٨: ٢٤"
  },
  {
    verse: "سَبِّحُوا الرَّبَّ يَا جَمِيعَ الأُمَمِ. احْمَدُوهُ يَا كَافَّةَ الشُّعُوبِ",
    reference: "مزمور ١١٧: ١"
  },
  {
    verse: "وَأَمَّا ثَمَرُ الرُّوحِ فَهُوَ: مَحَبَّةٌ فَرَحٌ سَلاَمٌ، طُولُ أَنَاةٍ لُطْفٌ صَلاَحٌ، إِيمَانٌ وَدَاعَةٌ تَعَفُّفٌ",
    reference: "غلاطية ٥: ٢٢-٢٣"
  },
  // آيات الحكمة والفهم
  {
    verse: "بَدْءُ الْحِكْمَةِ مَخَافَةُ الرَّبِّ، وَمَعْرِفَةُ الْقُدُّوسِ فَهْمٌ",
    reference: "أمثال ٩: ١٠"
  },
  {
    verse: "ثِق بِالرَّبِّ مِنْ كُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لاَ تَعْتَمِدْ",
    reference: "أمثال ٣: ٥"
  },
  {
    verse: "وَمَتَى جَاءَ ذَاكَ، رُوحُ الْحَقِّ، فَهُوَ يُرْشِدُكُمْ إِلَى جَمِيعِ الْحَقِّ",
    reference: "يوحنا ١٦: ١٣"
  },
  {
    verse: "كَلاَمُكَ سِرَاجٌ لِرِجْلِي وَنُورٌ لِسَبِيلِي",
    reference: "مزمور ١١٩: ١٠٥"
  },
  // آيات العطاء والسخاء
  {
    verse: "أَعْطُوا تُعْطَوْا، كَيْلاً جَيِّداً مُلَبَّداً مَهْزُوزاً فَائِضاً يُعْطُونَ فِي أَحْضَانِكُمْ",
    reference: "لوقا ٦: ٣٨"
  },
  {
    verse: "مَنْ يَرْحَمُ الْفَقِيرَ يُقْرِضُ الرَّبَّ، وَعَنْ مَعْرُوفِهِ يُجَازِيهِ",
    reference: "أمثال ١٩: ١٧"
  },
  {
    verse: "بِالْمَجَّانِ أَخَذْتُمْ، بِالْمَجَّانِ أَعْطُوا",
    reference: "متى ١٠: ٨"
  },
  {
    verse: "كُلُّ وَاحِدٍ كَمَا قَصَدَ بِقَلْبِهِ، لَيْسَ عَنْ حُزْنٍ أَوِ اضْطِرَارٍ. لأَنَّ الْمُعْطِيَ الْمَسْرُورَ يُحِبُّهُ اللهُ",
    reference: "كورنثوس الثانية ٩: ٧"
  },
  // آيات الوحدة والشركة
  {
    verse: "هُوَذَا مَا أَحْسَنَ وَمَا أَجْمَلَ أَنْ يَسْكُنَ الإِخْوَةُ مَعاً",
    reference: "مزمور ١٣٣: ١"
  },
  {
    verse: "لأَنَّهُ حَيْثُمَا اجْتَمَعَ اثْنَانِ أَوْ ثَلاَثَةٌ بِاسْمِي فَهُنَاكَ أَكُونُ فِي وَسَطِهِمْ",
    reference: "متى ١٨: ٢٠"
  },
  {
    verse: "مُحْتَمِلِينَ بَعْضُكُمْ بَعْضاً، وَمُسَامِحِينَ بَعْضُكُمْ بَعْضاً إِنْ كَانَ لأَحَدٍ عَلَى أَحَدٍ شَكْوَى",
    reference: "كولوسي ٣: ١٣"
  },
  {
    verse: "كَمَا أَنَّ الْجَسَدَ وَاحِدٌ وَلَهُ أَعْضَاءٌ كَثِيرَةٌ، وَكُلُّ أَعْضَاءِ الْجَسَدِ الْوَاحِدِ إِذَا كَانَتْ كَثِيرَةً فَهِيَ جَسَدٌ وَاحِدٌ، كَذلِكَ الْمَسِيحُ أَيْضاً",
    reference: "كورنثوس الأولى ١٢: ١٢"
  },
  // آيات النور والهداية
  {
    verse: "سِرَاجُ الْجَسَدِ هُوَ الْعَيْنُ، فَإِنْ كَانَتْ عَيْنُكَ بَسِيطَةً فَجَسَدُكَ كُلُّهُ يَكُونُ نَيِّراً",
    reference: "متى ٦: ٢٢"
  },
  {
    verse: "نُورُكُمْ هكَذَا فَلْيُضِئْ قُدَّامَ النَّاسِ، لِكَيْ يَرَوْا أَعْمَالَكُمُ الْحَسَنَةَ وَيُمَجِّدُوا أَبَاكُمُ الَّذِي فِي السَّمَاوَاتِ",
    reference: "متى ٥: ١٦"
  },
  {
    verse: "أَنْتُمْ نُورُ الْعَالَمِ. لاَ يُمْكِنُ أَنْ تُخْفَى مَدِينَةٌ مَوْضُوعَةٌ عَلَى جَبَل",
    reference: "متى ٥: ١٤"
  },
  {
    verse: "لأَنَّ اللهَ الَّذِي قَالَ أَنْ يُشْرِقَ نُورٌ مِنْ ظُلْمَةٍ، هُوَ الَّذِي أَشْرَقَ فِي قُلُوبِنَا، لإِنَارَةِ مَعْرِفَةِ مَجْدِ اللهِ فِي وَجْهِ يَسُوعَ الْمَسِيحِ",
    reference: "كورنثوس الثانية ٤: ٦"
  },
  // آيات الأمل والرجاء
  {
    verse: "لأَنِّي عَرَفْتُ الأَفْكَارَ الَّتِي أَنَا مُفْتَكِرٌ بِهَا عَنْكُمْ، يَقُولُ الرَّبُّ، أَفْكَارَ سَلاَمٍ لاَ شَرّ، لأُعْطِيَكُمْ آخِرَةً وَرَجَاءً",
    reference: "إرميا ٢٩: ١١"
  },
  {
    verse: "وَأَمَّا الَّذِينَ يَنْتَظِرُونَ الرَّبَّ فَيُجَدِّدُونَ قُوَّةً. يَرْفَعُونَ أَجْنِحَةً كَالنُّسُورِ. يَجْرُونَ وَلاَ يَتْعَبُونَ، يَمْشُونَ وَلاَ يُعْيُونَ",
    reference: "إشعياء ٤٠: ٣١"
  },
  {
    verse: "مُبَارَكٌ الرَّجُلُ الَّذِي يَتَّكِلُ عَلَى الرَّبِّ وَكَانَ الرَّبُّ مُتَّكَلَهُ",
    reference: "إرميا ١٧: ٧"
  },
  {
    verse: "وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعاً لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ، الَّذِينَ هُمْ مَدْعُوُّونَ حَسَبَ قَصْدِهِ",
    reference: "رومية ٨: ٢٨"
  },
  // آيات القوة والنصرة
  {
    verse: "لاَ تَخَفْ وَلاَ تَرْتَعِبْ لأَنَّ الرَّبَّ إِلهَكَ مَعَكَ حَيْثُمَا تَذْهَبُ",
    reference: "يشوع ١: ٩"
  },
  {
    verse: "إِنْ كَانَ اللهُ مَعَنَا، فَمَنْ عَلَيْنَا؟",
    reference: "رومية ٨: ٣١"
  },
  {
    verse: "أَخِيراً يَا إِخْوَتِي تَقَوَّوْا فِي الرَّبِّ وَفِي شِدَّةِ قُوَّتِهِ",
    reference: "أفسس ٦: ١٠"
  },
  {
    verse: "اللهُ لَنَا مَلْجَأٌ وَقُوَّةٌ، عَوْناً فِي الضِّيقَاتِ وُجِدَ شَدِيداً",
    reference: "مزمور ٤٦: ١"
  },
  // آيات القداسة والطهارة
  {
    verse: "طُوبَى لِلأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ",
    reference: "متى ٥: ٨"
  },
  {
    verse: "إِذاً إِنْ كَانَ أَحَدٌ يُطَهِّرُ نَفْسَهُ مِنْ هذِهِ، يَكُونُ إِنَاءً لِلْكَرَامَةِ، مُقَدَّساً، نَافِعاً لِلسَّيِّدِ، مُسْتَعَدّاً لِكُلِّ عَمَل صَالِحٍ",
    reference: "تيموثاوس الثانية ٢: ٢١"
  },
  {
    verse: "اُقْتَرِبُوا إِلَى اللهِ فَيَقْتَرِبَ إِلَيْكُمْ. نَظِّفُوا الأَيَادِيَ أَيُّهَا الْخُطَاةُ، وَطَهِّرُوا الْقُلُوبَ يَا ذَوِي الرَّأْيَيْنِ",
    reference: "يعقوب ٤: ٨"
  },
  // آيات المثابرة والجهاد
  {
    verse: "جَاهِدِ الْجِهَادَ الْحَسَنَ لِلإِيمَانِ، وَأَمْسِكْ بِالْحَيَاةِ الأَبَدِيَّةِ الَّتِي إِلَيْهَا دُعِيتَ",
    reference: "تيموثاوس الأولى ٦: ١٢"
  },
  {
    verse: "قَدْ جَاهَدْتُ الْجِهَادَ الْحَسَنَ، أَكْمَلْتُ السَّعْيَ، حَفِظْتُ الإِيمَانَ",
    reference: "تيموثاوس الثانية ٤: ٧"
  },
  {
    verse: "وَكُلُّ مَنْ يُجَاهِدُ يَضْبِطُ نَفْسَهُ فِي كُلِّ شَيْءٍ. أَمَّا أُولئِكَ فَلِكَيْ يَأْخُذُوا إِكْلِيلاً يَفْنَى، وَأَمَّا نَحْنُ فَإِكْلِيلاً لاَ يَفْنَى",
    reference: "كورنثوس الأولى ٩: ٢٥"
  },
  // آيات الشكر والحمد
  {
    verse: "اُدْخُلُوا أَبْوَابَهُ بِحَمْدٍ، دِيَارَهُ بِالتَّسْبِيحِ. احْمَدُوهُ، بَارِكُوا اسْمَهُ",
    reference: "مزمور ١٠٠: ٤"
  },
  {
    verse: "اشْكُرُوا الرَّبَّ لأَنَّهُ صَالِحٌ، لأَنَّ إِلَى الأَبَدِ رَحْمَتَهُ",
    reference: "مزمور ١١٨: ١"
  },
  {
    verse: "لِنَتَقَدَّمْ بِثِقَةٍ إِلَى عَرْشِ النِّعْمَةِ لِكَيْ نَنَالَ رَحْمَةً وَنَجِدَ نِعْمَةً عَوْناً فِي حِينِهِ",
    reference: "عبرانيين ٤: ١٦"
  },
  {
    verse: "كُلُّ نَفَسٍ فَلْتُسَبِّحِ الرَّبَّ. هَلِّلُويَا",
    reference: "مزمور ١٥٠: ٦"
  },
  // آيات الثبات والاستقرار
  {
    verse: "فَإِذْ قَدْ قَبِلْتُمُ الْمَسِيحَ يَسُوعَ الرَّبَّ اسْلُكُوا فِيهِ، مُتَأَصِّلِينَ وَمَبْنِيِّينَ فِيهِ وَمُوَطَّدِينَ فِي الإِيمَانِ",
    reference: "كولوسي ٢: ٦-٧"
  },
  {
    verse: "اُثْبُتُوا فِيَّ وَأَنَا فِيكُمْ. كَمَا أَنَّ الْغُصْنَ لاَ يَقْدِرُ أَنْ يَأْتِيَ بِثَمَرٍ مِنْ ذَاتِهِ إِنْ لَمْ يَثْبُتْ فِي الْكَرْمَةِ، كَذلِكَ أَنْتُمْ أَيْضاً إِنْ لَمْ تَثْبُتُوا فِيَّ",
    reference: "يوحنا ١٥: ٤"
  },
  {
    verse: "كُونُوا رَاسِخِينَ، غَيْرَ مُتَزَعْزِعِينَ، مُكْثِرِينَ فِي عَمَلِ الرَّبِّ كُلَّ حِينٍ، عَالِمِينَ أَنَّ تَعَبَكُمْ لَيْسَ بَاطِلاً فِي الرَّبِّ",
    reference: "كورنثوس الأولى ١٥: ٥٨"
  },
  {
    verse: "لِذلِكَ خُذُوا سِلاَحَ اللهِ الْكَامِلَ لِكَيْ تَقْدِرُوا أَنْ تُقَاوِمُوا فِي الْيَوْمِ الشِّرِّيرِ، وَبَعْدَ أَنْ تُتَمِّمُوا كُلَّ شَيْءٍ أَنْ تَثْبُتُوا",
    reference: "أفسس ٦: ١٣"
  },
  // آيات الرحمة والحنان
  {
    verse: "طُوبَى لِلرُّحَمَاءِ، لأَنَّهُمْ يُرْحَمُونَ",
    reference: "متى ٥: ٧"
  },
  {
    verse: "إِنَّ مَرَاحِمَ الرَّبِّ لاَ تَزُولُ. إِنَّ رَأْفَاتِهِ لاَ تَنْقَطِعُ. هِيَ جَدِيدَةٌ فِي كُلِّ صَبَاحٍ. كَثِيرَةٌ أَمَانَتُكَ",
    reference: "مراثي ٣: ٢٢-٢٣"
  },
  {
    verse: "رَحِيمٌ وَرَؤُوفٌ الرَّبُّ. طَوِيلُ الرُّوحِ وَكَثِيرُ الرَّحْمَةِ",
    reference: "مزمور ١٤٥: ٨"
  },
  {
    verse: "لأَنَّهُ يَعْرِفُ جِبْلَتَنَا، يَذْكُرُ أَنَّنَا تُرَابٌ نَحْنُ",
    reference: "مزمور ١٠٣: ١٤"
  },
  // آيات السلام والراحة
  {
    verse: "تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ. احْمِلُوا نِيرِي عَلَيْكُمْ وَتَعَلَّمُوا مِنِّي، لأَنِّي وَدِيعٌ وَمُتَوَاضِعُ الْقَلْبِ، فَتَجِدُوا رَاحَةً لِنُفُوسِكُمْ",
    reference: "متى ١١: ٢٨-٢٩"
  },
  {
    verse: "فِي السَّكِينَةِ وَالْهُدُوءِ تَكُونُ قُوَّتُكُمْ",
    reference: "إشعياء ٣٠: ١٥"
  },
  {
    verse: "الرَّبُّ يُقَاتِلُ عَنْكُمْ وَأَنْتُمْ تَصْمُتُونَ",
    reference: "خروج ١٤: ١٤"
  },
  {
    verse: "فِي مِيَاهٍ الرَّاحَةِ يُورِدُنِي. يَرُدُّ نَفْسِي. يَهْدِينِي إِلَى سُبُلِ الْبِرِّ مِنْ أَجْلِ اسْمِهِ",
    reference: "مزمور ٢٣: ٢-٣"
  },
  // آيات التعليم والتلمذة
  {
    verse: "وَأَمَّا أَنْتَ فَاثْبُتْ عَلَى مَا تَعَلَّمْتَ وَأَيْقَنْتَ، عَارِفاً مِمَّنْ تَعَلَّمْتَ",
    reference: "تيموثاوس الثانية ٣: ١٤"
  },
  {
    verse: "وَمَا سَمِعْتَهُ مِنِّي بِشُهُودٍ كَثِيرِينَ، أَوْدِعْهُ أُنَاساً أُمَنَاءَ، يَكُونُونَ أَكْفَاءً أَنْ يُعَلِّمُوا آخَرِينَ أَيْضاً",
    reference: "تيموثاوس الثانية ٢: ٢"
  },
  {
    verse: "فَاذْهَبُوا وَتَلْمِذُوا جَمِيعَ الأُمَمِ وَعَمِّدُوهُمْ بِاسْمِ الآب وَالابْنِ وَالرُّوحِ الْقُدُسِ، وَعَلِّمُوهُمْ أَنْ يَحْفَظُوا جَمِيعَ مَا أَوْصَيْتُكُمْ بِهِ",
    reference: "متى ٢٨: ١٩-٢٠"
  },
  {
    verse: "أَعْطِ الْحَكِيمَ فَيَكُونَ أَحْكَمَ. عَلِّمِ الصِّدِّيقَ فَيَزْدَادَ عِلْماً",
    reference: "أمثال ٩: ٩"
  },
  // آيات التواضع والوداعة
  {
    verse: "طُوبَى لِلْوُدَعَاءِ، لأَنَّهُمْ يَرِثُونَ الأَرْضَ",
    reference: "متى ٥: ٥"
  },
  {
    verse: "تَوَاضَعُوا قُدَّامَ الرَّبِّ فَيَرْفَعَكُمْ",
    reference: "يعقوب ٤: ١٠"
  },
  {
    verse: "قَبْلَ الْكَسْرِ الْكِبْرِيَاءُ، وَقَبْلَ السُّقُوطِ تَشَامُخُ الرُّوحِ",
    reference: "أمثال ١٦: ١٨"
  },
  {
    verse: "لاَ تَكُنْ حَكِيماً فِي عَيْنَيْ نَفْسِكَ. اتَّقِ الرَّبَّ وَابْعُدْ عَنِ الشَّرِّ",
    reference: "أمثال ٣: ٧"
  },
  // آيات الإيمان والثقة
  {
    verse: "أَجَابَ يَسُوعُ وَقَالَ لَهُمْ: اَلْحَقَّ أَقُولُ لَكُمْ: إِنْ كَانَ لَكُمْ إِيمَانٌ وَلاَ تَشُكُّونَ، فَلاَ تَفْعَلُونَ أَمْرَ التِّينَةِ فَقَطْ، بَلْ إِنْ قُلْتُمْ أَيْضاً لِهذَا الْجَبَلِ: انْتَقِلْ وَانْطَرِحْ فِي الْبَحْرِ فَيَكُونُ",
    reference: "متى ٢١: ٢١"
  },
  {
    verse: "فَقَالَ لَهُ يَسُوعُ: إِنْ كُنْتَ تَسْتَطِيعُ أَنْ تُؤْمِنَ. كُلُّ شَيْءٍ مُسْتَطَاعٌ لِلْمُؤْمِنِ",
    reference: "مرقس ٩: ٢٣"
  },
  {
    verse: "وَبِدُونِ إِيمَانٍ لاَ يُمْكِنُ إِرْضَاؤُهُ، لأَنَّهُ يَجِبُ أَنَّ الَّذِي يَأْتِي إِلَى اللهِ يُؤْمِنُ بِأَنَّهُ مَوْجُودٌ، وَأَنَّهُ يُجَازِي الَّذِينَ يَطْلُبُونَهُ",
    reference: "عبرانيين ١١: ٦"
  },
  {
    verse: "فَإِنِّي لَسْتُ أَسْتَحِي بِإِنْجِيلِ الْمَسِيحِ، لأَنَّهُ قُوَّةُ اللهِ لِلْخَلاَصِ لِكُلِّ مَنْ يُؤْمِنُ",
    reference: "رومية ١: ١٦"
  }
];

class NotificationService {
  
  // مفاتيح التخزين المحلي
  static STORAGE_KEYS = {
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    NOTIFICATION_TIME: 'notification_time',
    LAST_VERSE_INDEX: 'last_verse_index',
    PUSH_TOKEN: 'push_token',
    THURSDAY_REMINDER_ENABLED: 'thursday_reminder_enabled',
    THURSDAY_REMINDER_TIME: 'thursday_reminder_time'
  };

  // طلب الأذونات للإشعارات
  static async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('فشل في الحصول على إذن الإشعارات');
        return false;
      }

      // للحصول على push token
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-verses', {
          name: 'آيات يومية',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('خطأ في طلب أذونات الإشعارات:', error);
      return false;
    }
  }

  // الحصول على push token
  static async getPushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id' // يمكن تعديل هذا لاحقاً
      });
      await AsyncStorage.setItem(this.STORAGE_KEYS.PUSH_TOKEN, token.data);
      return token.data;
    } catch (error) {
      console.error('خطأ في الحصول على push token:', error);
      return null;
    }
  }

  // تفعيل الإشعارات اليومية
  static async enableDailyNotifications(time = { hour: 8, minute: 0 }) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('لم يتم منح إذن الإشعارات');
      }

      // إلغاء الإشعارات المجدولة مسبقاً
      await this.cancelDailyNotifications();

      // جدولة الإشعار اليومي
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🙏 آية اليوم - كنيسة الشهيد مارجرجس',
          body: 'اضغط لقراءة آية اليوم من الكتاب المقدس',
          data: { type: 'daily_verse' },
        },
        trigger: {
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        },
      });

      // حفظ الإعدادات
      await AsyncStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
      await AsyncStorage.setItem(this.STORAGE_KEYS.NOTIFICATION_TIME, JSON.stringify(time));

      console.log('تم تفعيل الإشعارات اليومية بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في تفعيل الإشعارات:', error);
      return false;
    }
  }

  // تفعيل إشعار الخميس للخدام (تذكير بالقداس)
  static async enableThursdayMassReminder(time = { hour: 20, minute: 0 }) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('لم يتم منح إذن الإشعارات');
      }

      // إلغاء إشعار الخميس المجدول مسبقاً
      await this.cancelThursdayMassReminder();

      // جدولة إشعار الخميس للخدام
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⛪ تذكير للخدام - القداس غداً',
          body: 'خادمنا الجميل متنساش تحضر القداس بدري بكره عشان تكون قدوه لأولادك',
          data: { 
            type: 'thursday_mass_reminder',
            message: 'تذكير بحضور القداس بدري يوم الجمعة'
          },
        },
        trigger: {
          weekday: 5, // الخميس (1=الأحد, 2=الاثنين, ... 5=الخميس)
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        },
      });

      // حفظ الإعدادات
      await AsyncStorage.setItem(this.STORAGE_KEYS.THURSDAY_REMINDER_ENABLED, 'true');
      await AsyncStorage.setItem(this.STORAGE_KEYS.THURSDAY_REMINDER_TIME, JSON.stringify(time));

      console.log('تم تفعيل تذكير الخميس للخدام بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في تفعيل تذكير الخميس:', error);
      return false;
    }
  }

  // إلغاء إشعار الخميس للخدام
  static async cancelThursdayMassReminder() {
    try {
      // الحصول على جميع الإشعارات المجدولة
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // إلغاء إشعارات الخميس فقط
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'thursday_mass_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.THURSDAY_REMINDER_ENABLED, 'false');
      console.log('تم إلغاء تذكير الخميس للخدام');
      return true;
    } catch (error) {
      console.error('خطأ في إلغاء تذكير الخميس:', error);
      return false;
    }
  }

  // التحقق من حالة تفعيل تذكير الخميس
  static async isThursdayReminderEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(this.STORAGE_KEYS.THURSDAY_REMINDER_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('خطأ في التحقق من حالة تذكير الخميس:', error);
      return false;
    }
  }

  // الحصول على وقت تذكير الخميس المحفوظ
  static async getThursdayReminderTime() {
    try {
      const timeString = await AsyncStorage.getItem(this.STORAGE_KEYS.THURSDAY_REMINDER_TIME);
      return timeString ? JSON.parse(timeString) : { hour: 20, minute: 0 };
    } catch (error) {
      console.error('خطأ في الحصول على وقت تذكير الخميس:', error);
      return { hour: 20, minute: 0 };
    }
  }

  // إلغاء الإشعارات اليومية
  static async cancelDailyNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
      console.log('تم إلغاء الإشعارات اليومية');
      return true;
    } catch (error) {
      console.error('خطأ في إلغاء الإشعارات:', error);
      return false;
    }
  }

  // التحقق من حالة تفعيل الإشعارات
  static async areNotificationsEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('خطأ في التحقق من حالة الإشعارات:', error);
      return false;
    }
  }

  // الحصول على وقت الإشعار المحفوظ
  static async getNotificationTime() {
    try {
      const timeString = await AsyncStorage.getItem(this.STORAGE_KEYS.NOTIFICATION_TIME);
      return timeString ? JSON.parse(timeString) : { hour: 8, minute: 0 };
    } catch (error) {
      console.error('خطأ في الحصول على وقت الإشعار:', error);
      return { hour: 8, minute: 0 };
    }
  }

  // الحصول على آية عشوائية
  static getDailyVerse() {
    const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
    return BIBLE_VERSES[randomIndex];
  }

  // الحصول على آية اليوم (مبنية على التاريخ)
  static getDailyVerseByDate(date = new Date()) {
    // استخدام التاريخ لضمان نفس الآية لنفس اليوم
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const verseIndex = dayOfYear % BIBLE_VERSES.length;
    return BIBLE_VERSES[verseIndex];
  }

  // إرسال إشعار فوري بآية
  static async sendInstantVerseNotification() {
    try {
      const verse = this.getDailyVerse();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ آية من الكتاب المقدس',
          body: `"${verse.verse.substring(0, 50)}..." - ${verse.reference}`,
          data: { 
            type: 'instant_verse',
            verse: verse.verse,
            reference: verse.reference
          },
        },
        trigger: null, // إرسال فوري
      });

      return true;
    } catch (error) {
      console.error('خطأ في إرسال الإشعار الفوري:', error);
      return false;
    }
  }

  // إرسال تذكير فوري للخدام بالقداس
  static async sendInstantMassReminder() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⛪ تذكير خاص للخدام',
          body: 'خادمنا الجميل متنساش تحضر القداس بدري بكره عشان تكون قدوه لأولادك',
          data: { 
            type: 'instant_mass_reminder',
            message: 'تذكير بحضور القداس بدري'
          },
        },
        trigger: null, // إرسال فوري
      });

      return true;
    } catch (error) {
      console.error('خطأ في إرسال تذكير القداس الفوري:', error);
      return false;
    }
  }

  // إرسال إشعار بآية مخصصة
  static async sendCustomVerseNotification(title, verseText, reference) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || '📖 آية مخصصة',
          body: `"${verseText.substring(0, 50)}..." - ${reference}`,
          data: { 
            type: 'custom_verse',
            verse: verseText,
            reference: reference
          },
        },
        trigger: null,
      });

      return true;
    } catch (error) {
      console.error('خطأ في إرسال الإشعار المخصص:', error);
      return false;
    }
  }

  // الحصول على جميع الآيات المتاحة
  static getAllVerses() {
    return BIBLE_VERSES;
  }

  // البحث في الآيات
  static searchVerses(searchTerm) {
    const term = searchTerm.toLowerCase();
    return BIBLE_VERSES.filter(verse => 
      verse.verse.toLowerCase().includes(term) || 
      verse.reference.toLowerCase().includes(term)
    );
  }

  // إضافة آية جديدة (للمدراء)
  static async addCustomVerse(verseText, reference) {
    try {
      // يمكن توسيع هذا لحفظ الآيات المخصصة في AsyncStorage
      const customVerses = await this.getCustomVerses();
      const newVerse = { verse: verseText, reference: reference };
      customVerses.push(newVerse);
      
      await AsyncStorage.setItem('custom_verses', JSON.stringify(customVerses));
      return true;
    } catch (error) {
      console.error('خطأ في إضافة آية مخصصة:', error);
      return false;
    }
  }

  // الحصول على الآيات المخصصة
  static async getCustomVerses() {
    try {
      const customVersesString = await AsyncStorage.getItem('custom_verses');
      return customVersesString ? JSON.parse(customVersesString) : [];
    } catch (error) {
      console.error('خطأ في الحصول على الآيات المخصصة:', error);
      return [];
    }
  }

  // إعداد معالج الإشعارات المستلمة
  static setupNotificationHandlers() {
    // معالج عند استلام إشعار أثناء تشغيل التطبيق
    Notifications.addNotificationReceivedListener(notification => {
      console.log('تم استلام إشعار:', notification);
    });

    // معالج عند النقر على الإشعار
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('تم النقر على إشعار:', response);
      const data = response.notification.request.content.data;
      
      if (data.type === 'daily_verse' || data.type === 'instant_verse' || data.type === 'custom_verse') {
        // يمكن إضافة منطق لعرض الآية في واجهة مخصصة
        console.log('آية الإشعار:', data.verse);
      } else if (data.type === 'thursday_mass_reminder' || data.type === 'instant_mass_reminder') {
        // يمكن إضافة منطق خاص بتذكير القداس
        console.log('تذكير القداس:', data.message);
      }
    });
  }

  // إحصائيات الإشعارات
  static async getNotificationStats() {
    try {
      const enabled = await this.areNotificationsEnabled();
      const time = await this.getNotificationTime();
      const customVersesCount = (await this.getCustomVerses()).length;
      const thursdayReminderEnabled = await this.isThursdayReminderEnabled();
      const thursdayReminderTime = await this.getThursdayReminderTime();
      
      return {
        enabled,
        notificationTime: time,
        totalBuiltinVerses: BIBLE_VERSES.length,
        customVersesCount,
        lastVerseIndex: await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_VERSE_INDEX) || '0',
        thursdayReminderEnabled,
        thursdayReminderTime
      };
    } catch (error) {
      console.error('خطأ في الحصول على إحصائيات الإشعارات:', error);
      return null;
    }
  }
}

export default NotificationService;
export { BIBLE_VERSES };
