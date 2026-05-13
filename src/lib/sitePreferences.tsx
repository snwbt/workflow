'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'zh';
type FontScale = '100' | '120' | '150';

interface SitePreferences {
  language: Language;
  fontScale: FontScale;
  cycleFontScale: () => void;
  toggleLanguage: () => void;
  t: (text?: string | null, vars?: Record<string, string | number>) => string;
}

const FONT_SCALES: FontScale[] = ['100', '120', '150'];
const LANGUAGE_KEY = 'wedding-language';
const FONT_SCALE_KEY = 'wedding-font-scale';

const zh: Record<string, string> = {
  'Welcome': '欢迎',
  'Schedule': '流程',
  'Venue': '地点',
  'Travel': '交通',
  'Seating': '座位',
  'Details': '详情',
  'RSVP': '回复',
  'Return to the top': '返回顶部',
  'Text size': '字体大小',
  'Translate to Mandarin Chinese': '切换为中文',
  'Show English': '切换为英文',
  'Wedding Concierge': '婚礼礼宾',
  'Message Wedding Concierge': '联系婚礼礼宾',
  'Kindly Respond': '敬请回复',
  'RSVP Now': '立即回复',
  'Get Directions': '获取路线',
  'Open in Google Maps': '在 Google 地图打开',
  'Directions': '路线',
  'Open route': '打开路线',
  'Reception': '晚宴',
  'Find your seat': '查询座位',
  'MRT': '地铁',
  'BUS': '巴士',
  'DRIVING': '驾车',
  'HOTEL': '酒店',
  'ACCESS': '无障碍',
  'Getting Here': '交通指南',
  'Arrival at The Westin': '抵达威斯汀酒店',
  'Travel information coming soon.': '交通信息即将更新。',
  'Map Preview': '地图预览',
  'Location details will be shared soon.': '地点详情将稍后分享。',
  'Driving & Parking': '驾车与停车',
  'From Your Hotel': '从酒店出发',
  'Accessibility': '无障碍设施',
  'Downtown MRT (DT17)': 'Downtown 地铁站 (DT17)',
  'Take the Downtown Line to Downtown MRT (DT17). Use Exit A and walk approximately 5 minutes via Marina View.': '乘搭市区线至 Downtown 地铁站 (DT17)，从 A 出口出站，经 Marina View 步行约5分钟。',
  'Marina Bay Financial Centre': '滨海湾金融中心',
  'Alight at Bus Stop 03519 and walk 3 minutes to The Westin.': '在03519巴士站下车，步行约3分钟抵达威斯汀酒店。',
  'Self-parking is available at Asia Square Tower 2 basement from $1.10 per 10-minute block ($6.60/hr) on weekdays.': 'Asia Square Tower 2 地下停车场提供自助泊车，平日收费为每10分钟1.10新元（每小时6.60新元）。',
  'Drop-off at the main hotel entrance on Marina View. Taxis and private hire vehicles may stop here.': '可在 Marina View 的酒店正门下车。德士与私召车可在此停靠。',
  'Self-parking is available at Asia Square Tower 2 basement from $1.10 per 10-minute block ($6.60/hr) on weekdays.\n\nDrop-off at the main hotel entrance on Marina View. Taxis and private hire vehicles may stop here.': 'Asia Square Tower 2 地下停车场提供自助泊车，平日收费为每10分钟1.10新元（每小时6.60新元）。\n\n可在 Marina View 的酒店正门下车。德士与私召车可在此停靠。',
  'The celebration will be held in the Grand Ballroom on Level 3. From the hotel lobby, take the lifts to Level 3.': '庆祝活动将在三楼大宴会厅举行。请从酒店大堂搭乘电梯至三楼。',
  'Wheelchair accessible entrances are available on Level 1. Please contact our concierge team at least 48 hours in advance to arrange assistance.': '一楼设有无障碍入口。如需协助，请至少提前48小时联系礼宾团队安排。',
  'Dress Code: {dressCode}': '着装：{dressCode}',

  'The Wedding Of': '婚礼邀请',
  'Russell & Siaw Min': 'Russell & Siaw Min',
  '23—24 October 2026': '2026年10月23日至24日',
  '23–24 October 2026': '2026年10月23日至24日',
  'The Westin Singapore': '新加坡威斯汀酒店',
  'A Weekend in Singapore': '新加坡的婚礼周末',
  'Dinner Reception · Grand Ballroom, Level 3': '婚宴 · 三楼大宴会厅',
  'Smart Formal': '正式优雅',
  'RSVP by June 25, 2026': '请于2026年6月25日前回复',
  'A Note From Us': '我们的话',
  'We are so thrilled to share this special moment with the people we love most. Thank you for your endless support, laughter, and love.': '我们很高兴能与最亲爱的你们分享这个特别时刻。谢谢你们一路以来的支持、欢笑与爱。',
  'Our Wedding Weekend': '我们的婚礼周末',
  'A note about the weekend': '关于婚礼周末',
  "Our Friday dinner is an intimate celebration with limited seating, while Saturday's Nuptial Mass is open to all who would like to join us in prayer and thanksgiving. Thank you for understanding as we do our best to gather meaningfully across both days.": '周五晚宴为小型温馨庆祝，席位有限；周六婚配弥撒欢迎所有愿意与我们一起祈祷和感恩的亲友参加。感谢你们的理解，让我们能在两天中以有意义的方式相聚。',
  'Friday': '星期五',
  'Saturday': '星期六',
  '23 October 2026': '2026年10月23日',
  '24 October 2026': '2026年10月24日',
  'June 25, 2026': '2026年6月25日',
  'Guest Arrival': '宾客抵达',
  'Hotel Lobby': '酒店大堂',
  'Please make your way to the Grand Ballroom on Level 3. Our welcome team will be on hand to guide you.': '请前往三楼大宴会厅。迎宾团队将在现场为您指引。',
  'Cocktail Reception': '迎宾酒会',
  'Grand Ballroom Foyer, Level 3': '三楼大宴会厅前厅',
  'Join us for light refreshments and a few moments of celebration before dinner begins.': '晚宴开始前，欢迎享用简单茶点并与我们一同庆祝。',
  'Guests to be Seated': '宾客入席',
  'Grand Ballroom, Level 3': '三楼大宴会厅',
  'Kindly take your seats as we prepare to begin the evening’s celebration.': '晚宴即将开始，敬请入席。',
  'Wedding Dinner': '婚宴',
  'Dinner will be served following the couple’s entrance.': '新人入场后将开始上菜。',
  'Toasts & Table Photos': '敬酒与桌照',
  'Raise a glass with us and share in a few treasured moments with the newlyweds.': '请与我们举杯同庆，留下珍贵的合影时刻。',
  'Evening Concludes': '晚宴结束',
  'Thank you for joining us on this special evening. We look forward to saying goodbye before you depart.': '感谢您与我们共度这个特别夜晚。离席前期待与您道别。',
  'Church of the Holy Family': '圣家堂',
  'Kindly arrive early to be seated before Mass begins.': '请提早抵达，以便在弥撒开始前入座。',
  'Nuptial Mass': '婚配弥撒',
  'Join us as we celebrate the sacrament of matrimony in the presence of family and friends.': '欢迎与我们一起在亲友见证下庆祝婚姻圣事。',
  'Congratulations & Family Photos': '祝福与家庭合影',
  'Following Mass, guests are warmly invited to greet the newlyweds and join us for photographs.': '弥撒结束后，欢迎向新人致意并一起拍照留念。',
  'Light Reception': '简单茶点',
  'Please join us for light refreshments and fellowship after the ceremony.': '仪式后欢迎留下享用茶点并相聚。',
  'Celebration Concludes': '庆祝结束',
  'Thank you for sharing in this blessed occasion with us.': '感谢您与我们分享这个蒙福的时刻。',
  'The Venues': '婚礼地点',
  'Where We Gather': '相聚之处',
  'Set above Marina Bay, the celebration will take place in the Grand Ballroom on Level 3.': '婚礼庆祝将在滨海湾上方的新加坡威斯汀酒店三楼大宴会厅举行。',
  '12 Marina View, Asia Square Tower 2, Singapore 018961': '新加坡 Marina View 12号，Asia Square Tower 2，邮区018961',
  '6 Chapel Road, Singapore 429509': '新加坡 Chapel Road 6号，邮区429509',
  'Valet parking is available at the main entrance.': '酒店正门提供代客泊车服务。',
  'Please arrive early to settle in before Mass begins.': '请提早抵达，以便在弥撒开始前安顿入座。',
  'A weekend of family, friends, and the city we love.': '与家人、朋友，以及我们喜爱的城市共度周末。',
  'What to Know': '须知事项',
  'Check back soon for frequently asked questions.': '常见问题即将更新。',
  'Am I invited to both the dinner and the Nuptial Mass?': '我是否受邀参加晚宴和婚配弥撒？',
  'Our dinner reception on Friday, 23 October will be an intimate celebration with limited seating, so attendance is by invitation only. We would be truly honoured to have you join us for our Nuptial Mass on Saturday, 24 October at Church of the Holy Family, as we celebrate our marriage before God, family, and friends.': '10月23日星期五的晚宴是席位有限的温馨庆祝，因此仅限受邀宾客出席。10月24日星期六，我们诚挚邀请您到圣家堂参加婚配弥撒，与我们在天主、家人和朋友面前庆祝婚姻。',
  'Can I bring a plus-one?': '我可以携带同行宾客吗？',
  'As we have made dinner arrangements based on the guests named in each invitation, we kindly ask that only those listed attend the dinner reception. If you would like to bring a plus-one for dinner, please let us know and we will do our best to accommodate where possible.': '由于晚宴安排是根据每份邀请中列明的宾客准备的，我们恳请只有名单上的宾客出席晚宴。如您希望携带同行宾客参加晚宴，请告诉我们，我们会尽量安排。',
  'Are children invited?': '小朋友是否受邀？',
  'We love your little ones. Please refer to your invitation for the guests included in your party. If you need any clarification, please feel free to reach out to us.': '我们很喜欢您的小朋友。请以您的邀请函中列明的宾客为准。如需确认，欢迎联系我们。',
  'Where can I park?': '哪里可以停车？',
  'Self-parking is available at Asia Square Tower 2 basement. There is parking available on-site at the Church of the Holy Family, but parking lots may be limited. We recommend arriving early or using ride-hailing services where convenient.': 'Asia Square Tower 2 地下停车场提供自助泊车。圣家堂现场也有停车位，但车位可能有限。建议提早抵达，或视情况使用叫车服务。',
  'What should I wear?': '应该穿什么？',
  'For the dinner reception, semi-casual, formal, or semi-formal attire is warmly welcome. For the Nuptial Mass, we kindly ask guests to dress modestly and respectfully for the church setting.': '晚宴欢迎半休闲、正式或半正式着装。婚配弥撒将在教堂举行，恳请宾客穿着端庄得体。',
  'Will there be assigned seating at the dinner reception?': '晚宴是否有指定座位？',
  'Yes, seating arrangements will be prepared for the evening. Please refer to the seating chart or approach our welcome team, who will be happy to assist you.': '是的，晚宴将安排指定座位。请查看座位图，或向迎宾团队询问，他们会很乐意协助您。',
  'Is there wheelchair access?': '是否有轮椅通道？',
  'Yes. Both the ballroom and church have lifts which are available on Level 1.': '有。宴会厅和教堂均有电梯，可从一楼使用。',
  'What time will the dinner reception end?': '晚宴预计几点结束？',
  'The dinner reception is expected to conclude around 10:00 PM.': '晚宴预计于晚上10点左右结束。',
  'What time should I arrive for the Nuptial Mass on Saturday, 24 October?': '10月24日星期六的婚配弥撒应几点抵达？',
  'Mass begins at 10:30 AM at Church of the Holy Family. We kindly recommend arriving by 10:00 AM so you have time to settle in before the ceremony begins.': '弥撒将于上午10:30在圣家堂开始。我们建议您于上午10:00前抵达，以便在仪式开始前安顿入座。',
  'Do I need to be Catholic to attend the Mass?': '我需要是天主教徒才能参加弥撒吗？',
  'Not at all. Guests of all faiths are very welcome. You may simply remain seated or follow along respectfully during the service.': '不需要。我们欢迎不同信仰的宾客参加。弥撒期间您可以安坐，或以尊重的方式跟随礼仪。',
  'May non-Catholic guests receive Holy Communion?': '非天主教宾客可以领圣体吗？',
  'Holy Communion is reserved for practising Catholics. Guests who are not receiving Communion are welcome to remain seated during this part of the Mass.': '圣体只供守规的天主教徒领受。不领圣体的宾客可在此环节安坐。',
  'Can I take photos during the church ceremony?': '教堂仪式期间可以拍照吗？',
  'We kindly ask guests to be present and mindful during Mass, and to avoid blocking the aisle or photographer. There will be time for greetings and photographs after the ceremony.': '弥撒期间恳请宾客专注参与，并避免阻挡通道或摄影师。仪式结束后会有问候与拍照时间。',
  'Will there be refreshments after Mass?': '弥撒后会有茶点吗？',
  'Light refreshments will be served after the ceremony, and we would love for you to stay a while and share in the joy of the morning with us.': '仪式后将提供简单茶点，欢迎您留下来与我们分享上午的喜悦。',
  'Who can I contact on the day itself?': '婚礼当天可以联系谁？',
  'Please reach out to a member of our wedding party or welcome team for assistance on the day, as we may be occupied with the celebration.': '当天如需协助，请联系婚礼团队或迎宾团队成员，因为我们可能正在忙于庆祝流程。',
  'We cannot wait to celebrate with you.': '我们迫不及待想与你一同庆祝。',

  'The favour of your reply is requested': '敬请回复',
  'Begin With Your Invite': '请先输入邀请信息',
  'Kindly respond by {date}.': '请于{date}前回复。',
  'Invite code': '邀请码',
  'Full Name': '姓名',
  'Email Address': '电子邮件地址',
  'Your name': '您的姓名',
  'Email address': '电子邮件地址',
  'Enter the code on your invitation': '请输入邀请函上的代码',
  'Jane Austen': '陈小明',
  'Joyfully Accepts': '欣然出席',
  'Regretfully Declines': '遗憾婉拒',
  'Continue': '继续',
  'Invitation unlocked': '邀请已确认',
  'We Saved Your Place': '我们已为您预留席位',
  '{label} invitation for {name}.': '{name}的{label}邀请',
  'Friday + Saturday': '周五与周六',
  'Saturday only': '仅周六',
  '{label} invitation': '{label}邀请',
  'Dinner reception and solemnisation Mass': '晚宴与婚配弥撒',
  'Solemnisation Mass': '婚配弥撒',
  'Number of guests attending (including yourself)': '出席人数（包括您本人）',
  'Spouse / plus-one names': '配偶／同行宾客姓名',
  'Guest {number} name': '第{number}位宾客姓名',
  'Will you attend the dinner reception on 23 October?': '您会出席10月23日的婚宴吗？',
  'Will you attend the solemnisation Mass on 24 October?': '您会出席10月24日的婚配弥撒吗？',
  'Dietary restrictions': '饮食限制',
  'Accessibility requirements': '无障碍需求',
  'Note to the couple': '给新人的留言',
  'Please write any dietary needs here': '请在此填写饮食需求',
  'Let us know how we can support you': '请告诉我们如何协助您',
  'Back': '返回',
  'Confirm RSVP': '确认回复',
  "We'll Miss You": '我们会想念您',
  'Thank you for letting us know. You may leave us a note below.': '感谢您告知我们。您也可以在下方留言。',
  'Thank You': '谢谢您',
  "We are so sorry you won't be able to join us, but we truly appreciate you letting us know.": '很遗憾您无法出席，但我们非常感谢您的回复。',
  "Thank you! We'll see you in October.": '谢谢！十月见。',
  'A confirmation has been sent to {email}.': '确认邮件已发送至 {email}。',
  'Submit another RSVP': '提交另一份回复',
  'Submitting your response...': '正在提交您的回复...',
  'RSVP Closed': '回复已截止',
  'The deadline to RSVP has passed. Please contact us directly if you have any questions.': '回复截止日期已过。如有问题，请直接联系我们。',
  'Please enter a valid invite code.': '请输入有效的邀请码。',
  'Please provide your name and email.': '请填写您的姓名和电子邮件。',
  'Please enter a valid email address.': '请输入有效的电子邮件地址。',
  'Please let us know if you can make it.': '请告知我们您是否能够出席。',
  'Please select between 1 and 4 guests attending.': '请选择1至4位出席人数。',
  'Please include the names of everyone attending with you.': '请填写所有同行宾客的姓名。',
  'Please confirm dinner reception attendance.': '请确认是否出席婚宴。',
  'Please confirm solemnisation Mass attendance.': '请确认是否出席婚配弥撒。',
  'An error occurred while submitting.': '提交时发生错误。',
  'A network error occurred. Please try again.': '网络错误，请重试。',
  'Yes': '是',
  'No': '否',

  'The Westin Singapore Grand Ballroom': '新加坡威斯汀酒店大宴会厅',
  'Find Your Dinner Seat': '查询您的晚宴座位',
  'Search your name to see your table and seat for the reception.': '请输入姓名，查看您的晚宴桌号与座位。',
  'Guest name': '宾客姓名',
  'Start typing your name...': '请输入您的姓名...',
  'Searching...': '正在搜索...',
  'No assigned seat found yet. Please check your spelling or ask the welcome team.': '暂未找到座位安排。请检查拼写，或向迎宾团队询问。',
  'We could not load the seating plan just now.': '暂时无法加载座位图。',
  'Loading seating plan...': '正在加载座位图...',
  'Your seat assignment': '您的座位安排',
  'Table {table}, seat {seat}.': '第{table}桌，第{seat}座。',
  'Table {table}, seat {seat}. Enter from the bottom-right entrance and follow the aisle toward your highlighted table.': '第{table}桌，第{seat}座。请从右下方入口进入，沿通道前往标示的餐桌。',
  'Reception layout': '宴会厅布局',
  'Grand Ballroom': '大宴会厅',
  'Your table will highlight here after you choose your search result.': '选择搜索结果后，您的餐桌会在此标示。',
  'Back to results': '返回结果',
  'Back to main page': '返回主页',
  'Wedding dinner seating plan': '婚宴座位图',
  'Wedding aisle': '婚礼通道',
  'Entrance': '入口',
  'You are entering from here': '请从这里入场',
  'Screen': '屏幕',
  'Rostrum': '讲台',
  'Wedding': '婚礼',
  'Cake': '蛋糕',
  'Champagne': '香槟',
  'Fountain': '塔',
  'Wedding detail': '婚礼细节',
  'Detail 1': '细节一',
  'Detail 2': '细节二',
  'Detail 3': '细节三',
  'Wedding photo gallery': '婚礼照片集',
  'Gallery slides': '相册幻灯片',
  'Show gallery image {number}': '显示第{number}张照片',
  'Section navigation': '章节导航',
  'Scroll to previous section': '滚动到上一节',
  'Scroll to next section': '滚动到下一节',
  'Scroll to {section}': '滚动到{section}',
  'Hero': '首页',
  'At a glance': '概览',
  'Gallery': '相册',
  'FAQ': '常见问题',
  'Closing': '结尾',
};

const SitePreferencesContext = createContext<SitePreferences | null>(null);
const missingTranslations = new Set<string>();

function applyTemplate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'zh' ? 'zh' : 'en';
}

function getStoredFontScale(): FontScale {
  if (typeof window === 'undefined') return '100';
  const stored = window.localStorage.getItem(FONT_SCALE_KEY);
  return FONT_SCALES.includes(stored as FontScale) ? stored as FontScale : '100';
}

export function SitePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [fontScale, setFontScale] = useState<FontScale>('100');

  useEffect(() => {
    setLanguage(getStoredLanguage());
    setFontScale(getStoredFontScale());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.fontScale = fontScale;
    window.localStorage.setItem(FONT_SCALE_KEY, fontScale);
  }, [fontScale]);

  const value = useMemo<SitePreferences>(() => ({
    language,
    fontScale,
    cycleFontScale: () => {
      setFontScale((current) => FONT_SCALES[(FONT_SCALES.indexOf(current) + 1) % FONT_SCALES.length]);
    },
    toggleLanguage: () => setLanguage((current) => current === 'en' ? 'zh' : 'en'),
    t: (text, vars) => {
      if (!text) return '';
      const source = String(text);
      if (language !== 'zh') return applyTemplate(source, vars);
      if (!zh[source] && process.env.NODE_ENV === 'development' && !missingTranslations.has(source)) {
        missingTranslations.add(source);
        console.warn(`[i18n] Missing Mandarin translation: ${source}`);
      }
      return applyTemplate(zh[source] || source, vars);
    },
  }), [fontScale, language]);

  return (
    <SitePreferencesContext.Provider value={value}>
      {children}
    </SitePreferencesContext.Provider>
  );
}

export function useSiteText() {
  const context = useContext(SitePreferencesContext);
  if (!context) {
    return {
      language: 'en' as Language,
      fontScale: '100' as FontScale,
      cycleFontScale: () => {},
      toggleLanguage: () => {},
      t: (text?: string | null, vars?: Record<string, string | number>) => applyTemplate(text || '', vars),
    };
  }
  return context;
}
