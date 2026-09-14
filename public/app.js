/* ==========================================================================
   hko-local — SPA front end (original implementation)
   Data: Hong Kong Observatory Open Data API, proxied by ./server.js
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ *
 * i18n
 * ------------------------------------------------------------------ */

const I18N = {
  tc: {
    siteTitle: '本地天氣站', siteSub: '資料來源：香港天文台開放數據',
    searchPh: '搜尋地點…',
    navWeather: '天氣', navClimate: '氣候', navGeo: '地球物理', navAstro: '天文及授時',
    navRad: '輻射監測', navCommunity: '社群', navLearn: '學習', navMedia: '媒體及消息', navAbout: '關於我們',
    tabHome: '主頁', tabOverview: '總覽', tabRegional: '分區天氣', tabImagery: '天氣圖像',
    tabForecast: '九天預報', tabAlerts: '警告及提示', tabNews: '最新消息',
    tabAnalysis: '高解析度分析', tabLae: '低空作業', tabHome2: '主頁',
    tbFont: '文字大小', tbShare: '分享', tbSearch: '搜尋', tbMenu: '選單',
    shareCopied: '連結已複製', sideNavLabel: '天氣資訊導覽',
    pickerTitle: '天氣資料查詢', pickerParam: '參數', pickerStation: '地點', pickerAll: '全部地點',
    pickerScope: '涵蓋', pickerStations: '個地點', pickerMax: '最高', pickerMin: '最低', pickerMean: '平均',
    pickerNoData: '沒有資料', pickerNotPublished: '開放數據未提供', colStation: '地點', calm: '靜風',
    pickerSingle: '單站讀數（非網絡）',
    // secondary product pages
    uvTitle: '紫外線資訊', uvLevel: '強度', uvFeedNote: '紫外線指數由京士柏氣象站單一測站提供，並非全港網絡。',
    visTitle: '香港水域能見度', visibility: '能見度', visLow: '低', visMid: '中', visHigh: '高',
    visSource: '資料來源：LTMV 十分鐘平均能見度',
    reportTitle: '天氣報告',
    yestTitle: '昨日天氣及輻射水平資料', yestStation: '香港天文台總部', yestSource: '資料來源：RYES',
    colElement: '項目', colValue: '數值',
    climateTitle: '過去天氣及氣候', climateIntro: '以下為天文台總部的逐日氣候數據，取自開放數據中的氣候產品。',
    climMean: '本月平均', climMax: '本月最高', climMin: '本月最低', climDays: '有數據日數',
    climTemp: '日平均氣溫', climMaxT: '日最高氣溫', climMinT: '日最低氣溫',
    kpTitle: '京士柏氣象站', kpNote: '京士柏為天文台轄下測站，提供紫外線及風的讀數。',
    windSpeed: '風速',
    tcTitle: '熱帶氣旋警告（本港地區）', noTc: '現時沒有熱帶氣旋警告。', tcNote: '資料來源：rhrread 熱帶氣旋信息',
    rainstormTitle: '大雨及雷暴區域資訊', districtsWithRain: '有雨地區', maxRainfall: '最大雨量',
    colDistrict: '地區', rainfall: '雨量', noRain: '過去一小時全港沒有錄得雨量。',
    rainstormNote: '資料來源：rhrread 分區雨量及閃電資訊',
    lightningTitle: '閃電位置資訊服務', lightningActive: '現時有閃電活動', lightningNone: '現時沒有閃電活動',
    lightningImg: '閃電位置圖', lightningNote: '資料來源：閃電位置圖像',
    sunTitle: '太陽', moonTitle: '月亮', sunrise: '日出', sunset: '日落', moonrise: '月出', moonset: '月落',
    transit: '中天', colDate: '日期', astroNote: '資料來源：SRS / MRS',
    tideTitle: '潮汐', tideHigh: '最高潮位', tideLow: '最低潮位', tideNote: '資料來源：HHOT 長洲潮汐站 · 單位：米（海圖基準面以上）',
    eqTitle: '最新地震', eqNote: '資料來源：qem 地震服務 · 只顯示最近一次報告',
    productUnavailable: '此產品暫時無法取得', unknownProduct: '未知產品',
    unknownProductBody: '找不到這個產品的資料。', backHome: '返回主頁',
    productPolicy: '此產品在開放數據 API 中沒有對應的機器可讀介面，因此本站不會顯示其內容。本站只顯示可從公開數據取得的資料，不會複製或轉載天文台的圖像及文字。',
    seeOverview: '查看天氣總覽', seeImagery: '查看天氣圖像', productNote: '本頁由本機實作，並非天文台官方網站。',
    whyNoNews: '為何只顯示標題？', headlinesOnly: '只顯示標題，不轉載文章內容',
    // archive-backed pages
    histTitle: '觀測歷史', histIntro: '本站會把每次最新的觀測寫入本機資料庫，以下為已儲存的時間序列。資料自本站啟動後開始累積。',
    histSource: '資料', histObs: '地面觀測', histWind: '風觀測', histMetric: '項目',
    histPoints: '資料點', histWhen: '時間', histEmpty: '此測站尚未有足夠的歷史資料。',
    histNote: '資料來源：本機 SQLite 存檔（.cache/archive.db）',
    verdictTitle: '作業評估記錄', verdictIntro: '每次低空作業評估的結果都會存檔，可追溯當時的判斷原因。',
    verdictTotal: '記錄數', verdictCol: '判定', verdictWhy: '原因',
    verdictBlockers: '阻礙', verdictCautions: '注意', verdictEmpty: '尚未有評估記錄。',
    verdictNote: '資料來源：本機存檔 · 判定為本機模型輸出，非天文台官方評估',
    runsTitle: '分析執行記錄', runsIntro: '每次高解析度分析都會記錄所選的插值方法及交叉驗證分數，如方法選擇有變化可在此看到。',
    runsTotal: '執行次數', runsEstimators: '曾選用方法', runsRmse: 'RMSE 範圍',
    runsDrift: '曾選用多於一種方法 — 表示網絡或資料情況有變化。',
    runsEstimator: '所選方法', runsCorrection: '地形訂正', runsStations: '測站數',
    runsField: '分析場 (°C)', runsGrid: '網格', runsEmpty: '尚未有分析記錄。',
    runsNote: '資料來源：本機存檔 · 方法由交叉驗證自動選出',
    runsYes: '有幫助', runsNo: '無幫助',
    laeAlt: '作業高度',
    warnRefTitle: '警告類型參考', warnRefIntro: '以下是天文台警告的種類及其含義。最後一欄為一般市場慣例，並非投資建議 — 是否停市由交易所決定。',
    warnCode: '代碼', warnName: '名稱', warnMeaning: '含義', warnMarket: '市場慣例',
    warnInForce: '生效中', warnHalt: '一般停市', warnRefNote: '資料來源：HKO 開放數據 API 說明書（警告代碼）+ rhrread 即時警告狀態',
    fClimate: '香港氣候', fSummary: '每月天氣摘要', fNew: '新增項目', fOpen: '公開資料',
    fRelated: '相關網址', fGuide: '快速用戶指南', fContact: '聯絡我們', fNotice: '重要告示', fPrivacy: '私隱政策',
    loading: '載入中…', refresh: '即時更新', refreshing: '更新中…',
    footNote: '本機示範應用。天氣資料由香港天文台開放數據 API 提供，版權屬香港天文台所有。此介面為獨立實作，並非天文台官方網站。',
    live: '已連線 · 資料時間', stale: '離線快取 · 資料時間', err: '無法連線',
    justNow: '剛剛更新', minsAgo: '分鐘前',
    currentWx: '天氣實況', flwTitle: '本港地區天氣預報', nineDay: '九天天氣預報',
    regionalTemp: '分區天氣', regionalRain: '分區雨量', alertsTitle: '天氣警告',
    specialTips: '特別天氣提示', fireDanger: '火災危險警告',
    humidity: '相對濕度', uvindex: '紫外線指數', rainfall: '雨量', lightning: '閃電',
    updated: '更新時間', recordTime: '錄得時間', station: '地點', temp: '氣溫',
    maxRain: '最高雨量', minRain: '最低雨量', district: '地區',
    chartTemp: '氣溫', chartRain: '雨量', chartTitle: '分區氣溫立體圖',
    chartTitleRain: '分區雨量立體圖', chartHint: '滑鼠移至柱頂可看數值',
    noWarning: '現時沒有天氣警告。', noTip: '現時沒有特別天氣提示。',
    generalSituation: '天氣概況', outlook: '展望', forecastPeriod: '預報時段',
    seaTemp: '海水溫度', soilTemp: '土壤溫度', maxTemp: '最高氣溫', minTemp: '最低氣溫',
    maxRH: '最高濕度', minRH: '最低濕度', wind: '風', rainProb: '顯著降雨概率',
    today: '今日', errorTitle: '連線失敗',
    records: '個站點', unitC: '°C', unitMm: '毫米', unitPct: '%',
    radar: '雷達', satellite: '衛星', lightningImg: '閃電',
    weatherImagery: '天氣圖像', earthWeather: '地球天氣', worldWeather: '世界天氣',
    myLocation: '我的位置天氣', socialMedia: '社交媒體', hkoChannel: '天文台頻道',
    latestNews: '最新消息', weatherBlog: '天氣隨筆', hkoUpdates: '天文台最新動態',
    hkoBlog: '天文台網誌', hkClimate: '香港氣候', climateSummary: '氣候摘要',
    viewOnHko: '在天文台網站查看', hasFeed: 'RSS', noFeed: '此欄目不提供 RSS，請到天文台網站瀏覽。',
    mapTitle: '分區天氣圖', schematic: '示意圖，位置為約略值',
    less: '較低', more: '較高', locate: '定位', locating: '定位中…',
    solarTerm: '節氣', lunarDate: '農曆',
    tabAnalysis: '高解析度分析', analysisTitle: '高解析度地面氣溫分析',
    analysisSub: '由自動氣象站觀測內插至高解析度網格',
    methodTitle: '方法', estimator: '內插方法', selectedTag: '選用',
    rmse: '均方根誤差', mae: '平均絕對誤差', bias: '偏差', maxErr: '最大誤差',
    networkTitle: '測站網絡', stationCount: '測站數目', elevRange: '測站海拔',
    elevSpan: '海拔跨度', gridRes: '網格解析度', fieldTitle: '分析場統計',
    variogramTitle: '變差函數', nugget: '塊金', sill: '基台', range: '變程',
    showOverlay: '顯示分析場', hideOverlay: '隱藏分析場', refreshAnalysis: '重新分析',
    looNote: '方法優劣由留一交叉驗證（leave-one-out）實測決定，並非預設。',
    lowlandNote: '此測站網絡集中於低地，海拔跨度有限，因此氣溫遞減率修正屬外推而非擬合關係；交叉驗證顯示修正未能改善誤差，故本分析採用未經地形修正的內插法。',
    spansNote: '測站網絡涵蓋足夠地形起伏，氣溫遞減率修正經交叉驗證證實有效。',
    analysisPending: '正在計算分析場…', stationElev: '海拔',
    tabLae: '低空作業', laeTitle: '低空經濟（LAE）作業評估',
    laeSub: '結合分區風場、METAR／TAF 及天文台警告的起降決策',
    verdict: '作業決定', vGo: '可飛', vCaution: '注意', vNoGo: '不可飛', vUnknown: '未確定',
    factors: '評估因素', fFactor: '因素', fValue: '數值', fThreshold: '門檻', fStatus: '狀態',
    surfaceWind: '地面風（10 米平均）', gust: '最大陣風', gustSpread: '陣風跨度',
    windAtHeight: '作業高度風速', visibility: '能見度', ceiling: '雲底高度',
    thunder: '雷暴', lightningL: '閃電', precip: '降水', flightCat: '飛行分類', warnL: '天氣警告',
    metarTitle: 'METAR（實況）', tafTitle: 'TAF（預報）', rawReport: '原文',
    windField: '風場', windNet: '測風站', vecValidation: '向量交叉驗證',
    speedRmse: '風速 RMSE', dirMae: '風向平均誤差', altitudeL: '作業高度',
    thresholdsTitle: '門檻值（可調整，非官方標準）', altNote: '風速以冪律由 10 米外推至作業高度',
    notStandard: '此門檻為本示範自訂，並非任何認可標準，不可取代營運商自身的作業限制。',
    windArrows: '風向箭頭', stronger: '風速', opWindow: '預報窗口',
  },
  sc: {
    siteTitle: '本地气象站', siteSub: '数据来源：香港天文台开放数据',
    searchPh: '搜寻地点…',
    navWeather: '天气', navClimate: '气候', navGeo: '地球物理', navAstro: '天文及授时',
    navRad: '辐射监测', navCommunity: '社群', navLearn: '学习', navMedia: '媒体及消息', navAbout: '关于我们',
    tabHome: '主页', tabOverview: '总览', tabRegional: '分区天气', tabImagery: '天气图像',
    tabForecast: '九天预报', tabAlerts: '警告及提示', tabNews: '最新消息',
    tabAnalysis: '高分辨率分析', tabLae: '低空作业', tabHome2: '主页',
    tbFont: '文字大小', tbShare: '分享', tbSearch: '搜寻', tbMenu: '选单',
    shareCopied: '链接已复制', sideNavLabel: '天气信息导览',
    pickerTitle: '天气数据查询', pickerParam: '参数', pickerStation: '地点', pickerAll: '全部地点',
    pickerScope: '涵盖', pickerStations: '个地点', pickerMax: '最高', pickerMin: '最低', pickerMean: '平均',
    pickerNoData: '没有数据', pickerNotPublished: '开放数据未提供', colStation: '地点', calm: '静风',
    pickerSingle: '单站读数（非网络）',
    uvTitle: '紫外线信息', uvLevel: '强度', uvFeedNote: '紫外线指数由京士柏气象站单一测站提供，并非全港网络。',
    visTitle: '香港水域能见度', visibility: '能见度', visLow: '低', visMid: '中', visHigh: '高',
    visSource: '数据来源：LTMV 十分钟平均能见度',
    reportTitle: '天气报告',
    yestTitle: '昨日天气及辐射水平资料', yestStation: '香港天文台总部', yestSource: '数据来源：RYES',
    colElement: '项目', colValue: '数值',
    climateTitle: '过去天气及气候', climateIntro: '以下为天文台总部的逐日气候数据，取自开放数据中的气候产品。',
    climMean: '本月平均', climMax: '本月最高', climMin: '本月最低', climDays: '有数据日数',
    climTemp: '日平均气温', climMaxT: '日最高气温', climMinT: '日最低气温',
    kpTitle: '京士柏气象站', kpNote: '京士柏为天文台辖下测站，提供紫外线及风的读数。',
    windSpeed: '风速',
    tcTitle: '热带气旋警告（本港地区）', noTc: '现时没有热带气旋警告。', tcNote: '数据来源：rhrread 热带气旋信息',
    rainstormTitle: '大雨及雷暴区域信息', districtsWithRain: '有雨地区', maxRainfall: '最大雨量',
    colDistrict: '地区', rainfall: '雨量', noRain: '过去一小时全港没有录得雨量。',
    rainstormNote: '数据来源：rhrread 分区雨量及闪电信息',
    lightningTitle: '闪电位置信息服务', lightningActive: '现时有闪电活动', lightningNone: '现时没有闪电活动',
    lightningImg: '闪电位置图', lightningNote: '数据来源：闪电位置图像',
    sunTitle: '太阳', moonTitle: '月亮', sunrise: '日出', sunset: '日落', moonrise: '月出', moonset: '月落',
    transit: '中天', colDate: '日期', astroNote: '数据来源：SRS / MRS',
    tideTitle: '潮汐', tideHigh: '最高潮位', tideLow: '最低潮位', tideNote: '数据来源：HHOT 长洲潮汐站 · 单位：米（海图基准面以上）',
    eqTitle: '最新地震', eqNote: '数据来源：qem 地震服务 · 只显示最近一次报告',
    productUnavailable: '此产品暂时无法取得', unknownProduct: '未知产品',
    unknownProductBody: '找不到这个产品的资料。', backHome: '返回主页',
    productPolicy: '此产品在开放数据 API 中没有对应的机器可读接口，因此本站不会显示其内容。本站只显示可从公开数据取得的资料，不会复制或转载天文台的图像及文字。',
    seeOverview: '查看天气总览', seeImagery: '查看天气图像', productNote: '本页由本机实作，并非天文台官方网站。',
    whyNoNews: '为何只显示标题？', headlinesOnly: '只显示标题，不转载文章内容',
    histTitle: '观测历史', histIntro: '本站会把每次最新观测写入本机数据库，以下为已储存的时间序列。资料自本站启动后开始累积。',
    histSource: '资料', histObs: '地面观测', histWind: '风观测', histMetric: '项目',
    histPoints: '数据点', histWhen: '时间', histEmpty: '此测站尚未有足够的历史资料。',
    histNote: '数据来源：本机 SQLite 存档（.cache/archive.db）',
    verdictTitle: '作业评估记录', verdictIntro: '每次低空作业评估的结果都会存档，可追溯当时的判断原因。',
    verdictTotal: '记录数', verdictCol: '判定', verdictWhy: '原因',
    verdictBlockers: '阻碍', verdictCautions: '注意', verdictEmpty: '尚未有评估记录。',
    verdictNote: '数据来源：本机存档 · 判定为本机模型输出，非天文台官方评估',
    runsTitle: '分析执行记录', runsIntro: '每次高分辨率分析都会记录所选的插值方法及交叉验证分数，如方法选择有变化可在此看到。',
    runsTotal: '执行次数', runsEstimators: '曾选用方法', runsRmse: 'RMSE 范围',
    runsDrift: '曾选用多于一种方法 — 表示网络或资料情况有变化。',
    runsEstimator: '所选方法', runsCorrection: '地形订正', runsStations: '测站数',
    runsField: '分析场 (°C)', runsGrid: '网格', runsEmpty: '尚未有分析记录。',
    runsNote: '数据来源：本机存档 · 方法由交叉验证自动选出',
    runsYes: '有帮助', runsNo: '无帮助',
    laeAlt: '作业高度',
    warnRefTitle: '警告类型参考', warnRefIntro: '以下是天文台警告的种类及其含义。最后一栏为一般市场惯例，并非投资建议 — 是否停市由交易所决定。',
    warnCode: '代码', warnName: '名称', warnMeaning: '含义', warnMarket: '市场惯例',
    warnInForce: '生效中', warnHalt: '一般停市', warnRefNote: '数据来源：HKO 开放数据 API 说明书（警告代码）+ rhrread 即时警告状态',
    fClimate: '香港气候', fSummary: '每月天气摘要', fNew: '新增项目', fOpen: '公开资料',
    fRelated: '相关网址', fGuide: '快速用户指南', fContact: '联络我们', fNotice: '重要告示', fPrivacy: '私隐政策',
    loading: '加载中…', refresh: '即时更新', refreshing: '更新中…',
    footNote: '本机示范应用。天气数据由香港天文台开放数据 API 提供，版权属香港天文台所有。此界面为独立实现，并非天文台官方网站。',
    live: '已连线 · 数据时间', stale: '离线缓存 · 数据时间', err: '无法连线',
    justNow: '刚刚更新', minsAgo: '分钟前',
    currentWx: '天气实况', flwTitle: '本港地区天气预报', nineDay: '九天天气预报',
    regionalTemp: '分区天气', regionalRain: '分区雨量', alertsTitle: '天气警告',
    specialTips: '特别天气提示', fireDanger: '火灾危险警告',
    humidity: '相对湿度', uvindex: '紫外线指数', rainfall: '雨量', lightning: '闪电',
    updated: '更新时间', recordTime: '录得时间', station: '地点', temp: '气温',
    maxRain: '最高雨量', minRain: '最低雨量', district: '地区',
    chartTemp: '气温', chartRain: '雨量', chartTitle: '分区气温立体图',
    chartTitleRain: '分区雨量立体图', chartHint: '鼠标移至柱顶可看数值',
    noWarning: '现时没有天气警告。', noTip: '现时没有特别天气提示。',
    generalSituation: '天气概况', outlook: '展望', forecastPeriod: '预报时段',
    seaTemp: '海水温度', soilTemp: '土壤温度', maxTemp: '最高气温', minTemp: '最低气温',
    maxRH: '最高湿度', minRH: '最低湿度', wind: '风', rainProb: '显著降雨概率',
    today: '今日', errorTitle: '连线失败',
    records: '个站点', unitC: '°C', unitMm: '毫米', unitPct: '%',
    radar: '雷达', satellite: '卫星', lightningImg: '闪电',
    weatherImagery: '天气图像', earthWeather: '地球天气', worldWeather: '世界天气',
    myLocation: '我的位置天气', socialMedia: '社交媒体', hkoChannel: '天文台频道',
    latestNews: '最新消息', weatherBlog: '天气随笔', hkoUpdates: '天文台最新动态',
    hkoBlog: '天文台网志', hkClimate: '香港气候', climateSummary: '气候摘要',
    viewOnHko: '在天文台网站查看', hasFeed: 'RSS', noFeed: '此栏目不提供 RSS，请到天文台网站浏览。',
    mapTitle: '分区天气图', schematic: '示意图，位置为约略值',
    less: '较低', more: '较高', locate: '定位', locating: '定位中…',
    solarTerm: '节气', lunarDate: '农历',
    tabAnalysis: '高解析度分析', analysisTitle: '高解析度地面气温分析',
    analysisSub: '由自动气象站观测内插至高解析度网格',
    methodTitle: '方法', estimator: '内插方法', selectedTag: '选用',
    rmse: '均方根误差', mae: '平均绝对误差', bias: '偏差', maxErr: '最大误差',
    networkTitle: '测站网络', stationCount: '测站数目', elevRange: '测站海拔',
    elevSpan: '海拔跨度', gridRes: '网格解析度', fieldTitle: '分析场统计',
    variogramTitle: '变差函数', nugget: '块金', sill: '基台', range: '变程',
    showOverlay: '显示分析场', hideOverlay: '隐藏分析场', refreshAnalysis: '重新分析',
    looNote: '方法优劣由留一交叉验证（leave-one-out）实测决定，并非预设。',
    lowlandNote: '此测站网络集中于低地，海拔跨度有限，因此气温递减率修正属外推而非拟合关系；交叉验证显示修正未能改善误差，故本分析采用未经地形修正的内插法。',
    spansNote: '测站网络涵盖足够地形起伏，气温递减率修正经交叉验证证实有效。',
    analysisPending: '正在计算分析场…', stationElev: '海拔',
    tabLae: '低空作业', laeTitle: '低空经济（LAE）作业评估',
    laeSub: '结合分区风场、METAR／TAF 及天文台警告的起降决策',
    verdict: '作业决定', vGo: '可飞', vCaution: '注意', vNoGo: '不可飞', vUnknown: '未确定',
    factors: '评估因素', fFactor: '因素', fValue: '数值', fThreshold: '门槛', fStatus: '状态',
    surfaceWind: '地面风（10 米平均）', gust: '最大阵风', gustSpread: '阵风跨度',
    windAtHeight: '作业高度风速', visibility: '能见度', ceiling: '云底高度',
    thunder: '雷暴', lightningL: '闪电', precip: '降水', flightCat: '飞行分类', warnL: '天气警告',
    metarTitle: 'METAR（实况）', tafTitle: 'TAF（预报）', rawReport: '原文',
    windField: '风场', windNet: '测风站', vecValidation: '向量交叉验证',
    speedRmse: '风速 RMSE', dirMae: '风向平均误差', altitudeL: '作业高度',
    thresholdsTitle: '门槛值（可调整，非官方标准）', altNote: '风速以幂律由 10 米外推至作业高度',
    notStandard: '此门槛为本示范自订，并非任何认可标准，不可取代营运商自身的作业限制。',
    windArrows: '风向箭头', stronger: '风速', opWindow: '预报窗口',
  },
  en: {
    siteTitle: 'Local Weather Station', siteSub: 'Source: Hong Kong Observatory Open Data',
    searchPh: 'Search station…',
    navWeather: 'Weather', navClimate: 'Climate', navGeo: 'Geophysics', navAstro: 'Astronomy & Time',
    navRad: 'Radiation', navCommunity: 'Community', navLearn: 'Learning', navMedia: 'Media & News', navAbout: 'About Us',
    tabHome: 'Home', tabOverview: 'Overview', tabRegional: 'Regional', tabImagery: 'Imagery',
    tabForecast: '9-Day', tabAlerts: 'Warnings', tabNews: 'News',
    tabAnalysis: 'High-res analysis', tabLae: 'Low-altitude ops', tabHome2: 'Home',
    tbFont: 'Text size', tbShare: 'Share', tbSearch: 'Search', tbMenu: 'Menu',
    shareCopied: 'Link copied', sideNavLabel: 'Weather information navigation',
    pickerTitle: 'Weather data query', pickerParam: 'Parameter', pickerStation: 'Station', pickerAll: 'All stations',
    pickerScope: 'Coverage', pickerStations: 'stations', pickerMax: 'Max', pickerMin: 'Min', pickerMean: 'Mean',
    pickerNoData: 'No data', pickerNotPublished: 'Not in the open-data feed', colStation: 'Station', calm: 'Calm',
    pickerSingle: 'Single-station readings (not a network)',
    uvTitle: 'UV information', uvLevel: 'Level', uvFeedNote: 'The UV index comes from a single station (King\'s Park), not a territory-wide network.',
    visTitle: 'Visibility in HK waters', visibility: 'Visibility', visLow: 'Low', visMid: 'Moderate', visHigh: 'High',
    visSource: 'Source: LTMV 10-minute mean visibility',
    reportTitle: 'Weather report',
    yestTitle: "Yesterday's weather and radiation", yestStation: 'HKO Headquarters', yestSource: 'Source: RYES',
    colElement: 'Element', colValue: 'Value',
    climateTitle: 'Past weather and climate', climateIntro: 'Daily climate values at the Observatory headquarters, from the climate products in the open data set.',
    climMean: 'Month mean', climMax: 'Month max', climMin: 'Month min', climDays: 'Days with data',
    climTemp: 'Daily mean temperature', climMaxT: 'Daily maximum temperature', climMinT: 'Daily minimum temperature',
    kpTitle: "King's Park station", kpNote: "King's Park is an Observatory station reporting UV and wind.",
    windSpeed: 'Wind speed',
    tcTitle: 'Tropical cyclone warning (local)', noTc: 'No tropical cyclone warning is in force.', tcNote: 'Source: rhrread tropical cyclone message',
    rainstormTitle: 'Rainstorm and thunderstorm areas', districtsWithRain: 'Districts with rain', maxRainfall: 'Max rainfall',
    colDistrict: 'District', rainfall: 'Rainfall', noRain: 'No rainfall was recorded anywhere in the past hour.',
    rainstormNote: 'Source: rhrread district rainfall and lightning',
    lightningTitle: 'Lightning location service', lightningActive: 'Lightning is currently active', lightningNone: 'No lightning activity at present',
    lightningImg: 'Lightning location map', lightningNote: 'Source: lightning location imagery',
    sunTitle: 'Sun', moonTitle: 'Moon', sunrise: 'Sunrise', sunset: 'Sunset', moonrise: 'Moonrise', moonset: 'Moonset',
    transit: 'Transit', colDate: 'Date', astroNote: 'Source: SRS / MRS',
    tideTitle: 'Tides', tideHigh: 'Highest tide', tideLow: 'Lowest tide', tideNote: 'Source: HHOT Cheung Chau tide station · metres above chart datum',
    eqTitle: 'Latest earthquake', eqNote: 'Source: qem earthquake service · most recent report only',
    productUnavailable: 'This product is not available at the moment', unknownProduct: 'Unknown product',
    unknownProductBody: 'No information found for this product.', backHome: 'Back to home',
    productPolicy: 'This product has no machine-readable interface in the open data API, so this site does not display its content. Only data obtainable from the published open data is shown; the Observatory\'s imagery and text are not copied or republished.',
    seeOverview: 'Weather overview', seeImagery: 'Weather imagery', productNote: 'This page is a local implementation, not the official HKO website.',
    whyNoNews: 'Why headlines only?', headlinesOnly: 'headlines only; article bodies are not republished',
    histTitle: 'Observation history', histIntro: 'Every fresh observation is written to a local database. Below is the stored time series, which accumulates from the moment the service starts.',
    histSource: 'Series', histObs: 'Surface observations', histWind: 'Wind observations', histMetric: 'Metric',
    histPoints: 'Data points', histWhen: 'Time', histEmpty: 'Not enough history recorded for this station yet.',
    histNote: 'Source: local SQLite archive (.cache/archive.db)',
    verdictTitle: 'LAE assessment log', verdictIntro: 'Every low-altitude assessment is archived, so the reasoning behind a past decision can be traced.',
    verdictTotal: 'Records', verdictCol: 'Verdict', verdictWhy: 'Reason',
    verdictBlockers: 'Blockers', verdictCautions: 'Cautions', verdictEmpty: 'No assessments recorded yet.',
    verdictNote: 'Source: local archive · verdicts are this model\'s output, not an official HKO assessment',
    runsTitle: 'Analysis run log', runsIntro: 'Each high-resolution analysis records the interpolation method it selected and its cross-validation score, so a change in method selection is visible here.',
    runsTotal: 'Runs', runsEstimators: 'Methods used', runsRmse: 'RMSE range',
    runsDrift: 'More than one method has been selected — the network or the data conditions have changed.',
    runsEstimator: 'Selected method', runsCorrection: 'Terrain correction', runsStations: 'Stations',
    runsField: 'Field (°C)', runsGrid: 'Grid', runsEmpty: 'No analysis runs recorded yet.',
    runsNote: 'Source: local archive · method chosen automatically by cross-validation',
    runsYes: 'helped', runsNo: 'no help',
    laeAlt: 'Altitude',
    warnRefTitle: 'Warning reference', warnRefIntro: 'The Observatory\'s warning types and what each means. The final column reflects ordinary market practice and is not advice — the exchange decides whether to suspend trading.',
    warnCode: 'Code', warnName: 'Name', warnMeaning: 'Meaning', warnMarket: 'Market practice',
    warnInForce: 'in force', warnHalt: 'usual halt', warnRefNote: 'Source: HKO Open Data API documentation (warning codes) + live warning status from rhrread',
    fClimate: 'HK Climate', fSummary: 'Monthly Summary', fNew: "What's New", fOpen: 'Open Data',
    fRelated: 'Related Sites', fGuide: 'User Guide', fContact: 'Contact Us', fNotice: 'Important Notices', fPrivacy: 'Privacy Policy',
    loading: 'Loading…', refresh: 'Refresh', refreshing: 'Refreshing…',
    footNote: 'Local demonstration app. Weather data is provided by the Hong Kong Observatory Open Data API and remains the copyright of the Hong Kong Observatory. This interface is an independent implementation, not the official HKO website.',
    live: 'Connected · data time', stale: 'Offline cache · data time', err: 'Connection failed',
    justNow: 'updated just now', minsAgo: 'min ago',
    currentWx: 'Current Weather', flwTitle: 'Local Weather Forecast', nineDay: '9-Day Forecast',
    regionalTemp: 'Regional Weather', regionalRain: 'Regional Rainfall', alertsTitle: 'Weather Warnings',
    specialTips: 'Special Weather Tips', fireDanger: 'Fire Danger Warning',
    humidity: 'Relative Humidity', uvindex: 'UV Index', rainfall: 'Rainfall', lightning: 'Lightning',
    updated: 'Updated', recordTime: 'Recorded', station: 'Station', temp: 'Temp',
    maxRain: 'Max rainfall', minRain: 'Min rainfall', district: 'District',
    chartTemp: 'Temperature', chartRain: 'Rainfall', chartTitle: 'Regional temperature, 3-D view',
    chartTitleRain: 'Regional rainfall, 3-D view', chartHint: 'Hover a bar for its value',
    noWarning: 'No weather warnings in force.', noTip: 'No special weather tips at present.',
    generalSituation: 'General Situation', outlook: 'Outlook', forecastPeriod: 'Forecast Period',
    seaTemp: 'Sea Temperature', soilTemp: 'Soil Temperature', maxTemp: 'Max', minTemp: 'Min',
    maxRH: 'Max RH', minRH: 'Min RH', wind: 'Wind', rainProb: 'Prob. of significant rain',
    today: 'Today', errorTitle: 'Connection failed',
    records: 'stations', unitC: '°C', unitMm: 'mm', unitPct: '%',
    radar: 'Radar', satellite: 'Satellite', lightningImg: 'Lightning',
    weatherImagery: 'Weather Imagery', earthWeather: 'Earth Weather', worldWeather: 'World Weather',
    myLocation: 'Weather at My Location', socialMedia: 'Social Media', hkoChannel: 'HKO Channel',
    latestNews: 'What\'s New', weatherBlog: 'Weather Blog', hkoUpdates: 'HKO Updates',
    hkoBlog: 'HKO Blog', hkClimate: 'Hong Kong Climate', climateSummary: 'Climate Summary',
    viewOnHko: 'View on HKO website', hasFeed: 'RSS', noFeed: 'No RSS feed for this column — browse it on the HKO website.',
    mapTitle: 'Regional Weather Map', schematic: 'Schematic — station positions are approximate',
    less: 'Lower', more: 'Higher', locate: 'Locate', locating: 'Locating…',
    solarTerm: 'Solar term', lunarDate: 'Lunar',
    tabAnalysis: 'High-res Analysis', analysisTitle: 'High-resolution Surface Temperature Analysis',
    analysisSub: 'Station observations interpolated onto a high-resolution grid',
    methodTitle: 'Method', estimator: 'Estimator', selectedTag: 'selected',
    rmse: 'RMSE', mae: 'MAE', bias: 'Bias', maxErr: 'Max error',
    networkTitle: 'Observation Network', stationCount: 'Stations', elevRange: 'Station elevation',
    elevSpan: 'Elevation span', gridRes: 'Grid resolution', fieldTitle: 'Field Statistics',
    variogramTitle: 'Variogram', nugget: 'Nugget', sill: 'Sill', range: 'Range',
    showOverlay: 'Show analysis field', hideOverlay: 'Hide analysis field', refreshAnalysis: 'Recompute',
    looNote: 'The estimators are ranked by leave-one-out cross-validation on live observations, not by assumption.',
    lowlandNote: 'This network sits almost entirely in the lowlands, so the lapse-rate correction is extrapolation rather than a fitted relationship. Cross-validation shows it does not reduce error here, so the uncorrected estimator is used.',
    spansNote: 'The network spans enough relief for the lapse-rate correction to be identifiable; cross-validation confirms it helps.',
    analysisPending: 'Computing analysis field…', stationElev: 'Elev',
    tabLae: 'LAE Ops', laeTitle: 'Low-Altitude Economy (LAE) operations assessment',
    laeSub: 'Go/no-go from the district wind field, METAR/TAF and Observatory warnings',
    verdict: 'Verdict', vGo: 'GO', vCaution: 'CAUTION', vNoGo: 'NO-GO', vUnknown: 'UNKNOWN',
    factors: 'Assessment factors', fFactor: 'Factor', fValue: 'Value', fThreshold: 'Threshold', fStatus: 'Status',
    surfaceWind: 'Surface wind (10 m mean)', gust: 'Maximum gust', gustSpread: 'Gust spread',
    windAtHeight: 'Wind at operating altitude', visibility: 'Visibility', ceiling: 'Cloud ceiling',
    thunder: 'Thunderstorm', lightningL: 'Lightning', precip: 'Precipitation',
    flightCat: 'Flight category', warnL: 'Weather warnings',
    metarTitle: 'METAR (observed)', tafTitle: 'TAF (forecast)', rawReport: 'Raw report',
    windField: 'Wind field', windNet: 'Wind stations', vecValidation: 'Vector cross-validation',
    speedRmse: 'Speed RMSE', dirMae: 'Direction MAE', altitudeL: 'Operating altitude',
    thresholdsTitle: 'Thresholds (configurable, not an official standard)',
    altNote: 'wind is extrapolated from 10 m to the operating altitude by a power law',
    notStandard: 'These thresholds are this demonstration\'s own starting point. They are not an approved standard and do not replace an operator\'s own documented limits.',
    windArrows: 'Wind arrows', stronger: 'Speed', opWindow: 'Forecast window',
  },
};

/* ------------------------------------------------------------------ *
 * HK observation stations: approximate coordinates for the schematic map
 * ------------------------------------------------------------------ */

const HK_STATIONS = [
  { tc: '赤鱲角',     sc: '赤鱲角',     en: 'Chek Lap Kok',          lat: 22.309, lon: 113.915 },
  { tc: '長洲',       sc: '长洲',       en: 'Cheung Chau',           lat: 22.201, lon: 114.027 },
  { tc: '清水灣',     sc: '清水湾',     en: 'Clear Water Bay',       lat: 22.263, lon: 114.293 },
  { tc: '跑馬地',     sc: '跑马地',     en: 'Happy Valley',          lat: 22.270, lon: 114.183 },
  { tc: '香港天文台', sc: '香港天文台', en: 'Hong Kong Observatory', lat: 22.302, lon: 114.174 },
  { tc: '香港公園',   sc: '香港公园',   en: 'Hong Kong Park',        lat: 22.278, lon: 114.160 },
  { tc: '滘西洲',     sc: '滘西洲',     en: 'Kau Sai Chau',          lat: 22.359, lon: 114.330 },
  { tc: '九龍城',     sc: '九龙城',     en: 'Kowloon City',          lat: 22.332, lon: 114.190 },
  { tc: '觀塘',       sc: '观塘',       en: 'Kwun Tong',             lat: 22.318, lon: 114.223 },
  { tc: '流浮山',     sc: '流浮山',     en: 'Lau Fau Shan',          lat: 22.469, lon: 113.984 },
  { tc: '昂坪',       sc: '昂坪',       en: 'Ngong Ping',            lat: 22.256, lon: 113.913 },
  { tc: '北潭涌',     sc: '北潭涌',     en: 'Pak Tam Chung',         lat: 22.395, lon: 114.318 },
  { tc: '坪洲',       sc: '坪洲',       en: 'Peng Chau',             lat: 22.291, lon: 114.043 },
  { tc: '西貢',       sc: '西贡',       en: 'Sai Kung',              lat: 22.382, lon: 114.274 },
  { tc: '沙田',       sc: '沙田',       en: 'Sha Tin',               lat: 22.402, lon: 114.210 },
  { tc: '深水埗',     sc: '深水埗',     en: 'Sham Shui Po',          lat: 22.335, lon: 114.137 },
  { tc: '筲箕灣',     sc: '筲箕湾',     en: 'Shau Kei Wan',          lat: 22.282, lon: 114.236 },
  { tc: '石崗',       sc: '石岗',       en: 'Shek Kong',             lat: 22.427, lon: 114.080 },
  { tc: '上水',       sc: '上水',       en: 'Sheung Shui',           lat: 22.500, lon: 114.117 },
  { tc: '打鼓嶺',     sc: '打鼓岭',     en: 'Ta Kwu Ling',           lat: 22.528, lon: 114.157 },
  { tc: '大美督',     sc: '大美督',     en: 'Tai Mei Tuk',           lat: 22.467, lon: 114.237 },
  { tc: '大帽山',     sc: '大帽山',     en: 'Tai Mo Shan',           lat: 22.411, lon: 114.124 },
  { tc: '大埔',       sc: '大埔',       en: 'Tai Po',                lat: 22.449, lon: 114.169 },
  { tc: '大老山',     sc: '大老山',     en: "Tate's Cairn",          lat: 22.358, lon: 114.218 },
  { tc: '山頂',       sc: '山顶',       en: 'The Peak',              lat: 22.268, lon: 114.148 },
  { tc: '將軍澳',     sc: '将军澳',     en: 'Tseung Kwan O',         lat: 22.315, lon: 114.256 },
  { tc: '青衣',       sc: '青衣',       en: 'Tsing Yi',              lat: 22.344, lon: 114.099 },
  { tc: '荃灣可觀',   sc: '荃湾可观',   en: 'Tsuen Wan Ho Koon',     lat: 22.371, lon: 114.108 },
  { tc: '荃灣城門谷', sc: '荃湾城门谷', en: 'Tsuen Wan Shing Mun Valley', lat: 22.377, lon: 114.140 },
  { tc: '屯門',       sc: '屯门',       en: 'Tuen Mun',              lat: 22.393, lon: 113.976 },
  { tc: '元朗',       sc: '元朗',       en: 'Yuen Long',             lat: 22.444, lon: 114.022 },
  { tc: '黃竹坑',     sc: '黄竹坑',     en: 'Wong Chuk Hang',        lat: 22.248, lon: 114.170 },
  { tc: '啟德',       sc: '启德',       en: 'Kai Tak',               lat: 22.317, lon: 114.213 },
  { tc: '橫瀾島',     sc: '横澜岛',     en: 'Waglan Island',         lat: 22.182, lon: 114.303 },
  { tc: '赤柱',       sc: '赤柱',       en: 'Stanley',               lat: 22.213, lon: 114.217 },

  /* Additional temperature stations returned by rhrread */
  { tc: '京士柏',     sc: '京士柏',     en: "King's Park",           lat: 22.310, lon: 114.173 },
  { tc: '黃大仙',     sc: '黄大仙',     en: 'Wong Tai Sin',          lat: 22.342, lon: 114.196 },
  { tc: '啟德跑道公園', sc: '启德跑道公园', en: 'Kai Tak Runway Park', lat: 22.305, lon: 114.213 },
  { tc: '元朗公園',   sc: '元朗公园',   en: 'Yuen Long Park',        lat: 22.442, lon: 114.018 },

  /* The 18 districts used by the rainfall feed (districts, not stations) */
  { tc: '中西區',     sc: '中西区',     en: 'Central & Western',     lat: 22.283, lon: 114.150 },
  { tc: '東區',       sc: '东区',       en: 'Eastern',               lat: 22.283, lon: 114.223 },
  { tc: '葵青',       sc: '葵青',       en: 'Kwai Tsing',            lat: 22.355, lon: 114.130 },
  { tc: '離島區',     sc: '离岛区',     en: 'Islands',               lat: 22.260, lon: 113.950 },
  { tc: '北區',       sc: '北区',       en: 'North',                 lat: 22.495, lon: 114.150 },
  { tc: '南區',       sc: '南区',       en: 'Southern',              lat: 22.240, lon: 114.160 },
  { tc: '荃灣',       sc: '荃湾',       en: 'Tsuen Wan',             lat: 22.371, lon: 114.115 },
  { tc: '灣仔',       sc: '湾仔',       en: 'Wan Chai',              lat: 22.278, lon: 114.175 },
  { tc: '油尖旺',     sc: '油尖旺',     en: 'Yau Tsim Mong',         lat: 22.312, lon: 114.170 },
];

/** lang -> { stationName: {lat, lon} } */
const STATION_LOOKUP = (() => {
  const out = {};
  for (const lang of ['tc', 'sc', 'en']) {
    out[lang] = {};
    for (const s of HK_STATIONS) out[lang][s[lang]] = { lat: s.lat, lon: s.lon };
  }
  return out;
})();

function stationCoords(name) {
  // The rainfall feed returns administrative districts that carry a "District"
  // suffix in English ('Central & Western District'), while the station list
  // does not ('Central & Western'). Try both forms.
  const tryName = (n) => {
    for (const lang of ['tc', 'sc', 'en']) {
      if (STATION_LOOKUP[lang][n]) return STATION_LOOKUP[lang][n];
    }
    return null;
  };
  const bare = String(name).replace(/\s+District$/, '');
  return tryName(name) || tryName(`${name} District`) || tryName(bare) || null;
}

/* ------------------------------------------------------------------ *
 * state
 * ------------------------------------------------------------------ */

const state = {
  lang: 'tc',
  route: 'home',
  bundle: null,
  fetchedAt: null,
  stale: false,
  loading: false,
  error: null,
  regional: { sortDir: 'desc', sortDirRain: 'desc', dataset: 'temp', filter: '' },
  chart: { items: [], hover: null, box: null, canvas: null },
  autoTimer: null,
  analysis: null,
  analysisLoading: false,
  analysisError: null,
  analysisInFlight: null,
  showOverlay: true,
  lae: null,
  laeLoading: false,
  laeError: null,
  laeInFlight: null,
  laeAlt: 120,
  fontSize: 0,
  picker: { param: 'temp', station: null },
  wind: null,
  windInFlight: null,
  products: null,
  productsInFlight: null,
  productKey: null,
  archive: {
    stations: null, stationsInFlight: false,
    series: null, seriesKey: null, pending: null,
    kind: 'observation', station: null, metric: 'temperature_c',
    lae: null, laePending: false,
    analysis: null, analysisPending: false,
  },
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;

/** Routes whose content comes from the dated/climatological product bundle. */
const PRODUCT_ROUTES = ['visibility', 'yesterday', 'climate', 'astronomy', 'tides', 'earthquake'];

const ROUTES = [
  'home', 'overview', 'regional', 'analysis', 'lae', 'imagery', 'forecast', 'alerts', 'news',
  'rainfall', 'uv', 'visibility', 'report', 'yesterday', 'climate', 'kp',
  'tc', 'rainstorm', 'lightning', 'astronomy', 'tides', 'earthquake', 'product',
  'history', 'verdicts', 'runs', 'warningref',
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.en[k] || k;

/* ------------------------------------------------------------------ *
 * utilities
 * ------------------------------------------------------------------ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function num(v, dp = 1) { return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(dp); }

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function parseCompactDate(s) {
  const m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function fmtDM(s) { const d = parseCompactDate(s); return d ? `${d.getMonth() + 1}/${d.getDate()}` : '—'; }

/** Today (or a given date) in Hong Kong as YYYY-MM-DD — the API's date format. */
function hkDateStr(d = new Date()) {
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function relTime(ts) {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - ts) / 60000);
  return mins <= 0 ? t('justNow') : `${mins} ${t('minsAgo')}`;
}

/* colour ramps */
function hexToRgb(h) { const s = h.replace('#', ''); return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)]; }
function rgbToHex(r,g,b){ const c = n => Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0'); return `#${c(r)}${c(g)}${c(b)}`; }
function mixHex(a,b,f){ const [r1,g1,b1]=hexToRgb(a), [r2,g2,b2]=hexToRgb(b); return rgbToHex(r1+(r2-r1)*f, g1+(g2-g1)*f, b1+(b2-b1)*f); }
function shade(hex,f){ const [r,g,b]=hexToRgb(hex); if (f>=0) return rgbToHex(r+(255-r)*f, g+(255-g)*f, b+(255-b)*f); const k=1+f; return rgbToHex(r*k,g*k,b*k); }

function tempColor(v) {
  if (v == null || isNaN(v)) return '#8aa0b4';
  const stops = [[8,'#2f6fb5'],[14,'#3f9ad1'],[20,'#4fb3a5'],[25,'#8ec24a'],[29,'#e8b230'],[32,'#e07b2c'],[35,'#c0392b']];
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [v0,c0] = stops[i-1], [v1,c1] = stops[i];
      return mixHex(c0, c1, (v - v0) / (v1 - v0 || 1));
    }
  }
  return stops[stops.length-1][1];
}
function rainColor(v, max = 40) { return mixHex('#cfe3f5', '#1c5f9e', Math.min(1, (Number(v)||0) / max)); }

/* ------------------------------------------------------------------ *
 * data
 * ------------------------------------------------------------------ */

async function loadBundle(force = false) {
  state.loading = true;
  renderStatus();
  try {
    const res = await fetch(`/api/home?lang=${encodeURIComponent(state.lang)}${force ? '&force=1' : ''}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    state.bundle = json;
    state.fetchedAt = Date.now();
    state.stale = !!json.stale;
    state.error = null;
    renderAll();
  } catch (err) {
    state.error = err.message || String(err);
    if (!state.bundle) renderAll();
  } finally {
    state.loading = false;
    renderStatus();
  }
}

function scheduleAutoRefresh() {
  if (state.autoTimer) clearInterval(state.autoTimer);
  state.autoTimer = setInterval(() => { if (!document.hidden) loadBundle(true); }, AUTO_REFRESH_MS);
}

/* The analysis is expensive to compute (terrain mosaic + interpolation) and
   changes only when the observations do, so it is fetched on demand rather
   than on every page refresh. */
async function loadAnalysis(force = false) {
  if (state.analysis && !force) return state.analysis;
  if (state.analysisInFlight && !force) return state.analysisInFlight;

  state.analysisLoading = true;
  state.analysisError = null;
  if (state.route === 'analysis') renderAll();

  const job = (async () => {
    const res = await fetch(`/api/analysis${force ? '?force=1' : ''}`);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  })();
  state.analysisInFlight = job;

  try {
    state.analysis = await job;
    state.analysisError = null;
  } catch (err) {
    state.analysisError = err.message || String(err);
    state.analysis = null;
  } finally {
    state.analysisInFlight = null;
    state.analysisLoading = false;
    if (state.route === 'analysis') renderAll();
  }
  return state.analysis;
}

/** Overlay descriptor for the SVG map, from the analysis grid bounds. */
function overlayFor() {
  const a = state.analysis;
  if (!a || !state.showOverlay) return null;
  return {
    href: `/analysis/field.png?t=${encodeURIComponent(a.generatedAt)}`,
    north: a.grid.north, south: a.grid.south, west: a.grid.west, east: a.grid.east,
  };
}

/* The LAE assessment is fetched on demand; it is heavier still (wind field plus
   two external aviation feeds). */
async function loadLae(force = false, alt = null) {
  if (alt != null) state.laeAlt = alt;
  if (state.lae && !force && alt == null) return state.lae;
  if (state.laeInFlight && !force) return state.laeInFlight;

  state.laeLoading = true;
  state.laeError = null;
  if (state.route === 'lae') renderAll();

  const job = (async () => {
    const res = await fetch(`/api/lae?alt=${encodeURIComponent(state.laeAlt)}${force ? '&force=1' : ''}`);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  })();
  state.laeInFlight = job;

  try {
    state.lae = await job;
    state.laeError = null;
  } catch (err) {
    state.laeError = err.message || String(err);
    state.lae = null;
  } finally {
    state.laeInFlight = null;
    state.laeLoading = false;
    if (state.route === 'lae') renderAll();
  }
  return state.lae;
}

/** Wind speed ramp — mirrors WIND_STOPS in lib/colormap.js. */
const WIND_STOPS_CLIENT = [
  [0, '#eaf5ff'], [10, '#a8d5f0'], [20, '#4a9fd8'],
  [30, '#f0b429'], [40, '#e07b2c'], [50, '#c0392b'],
];
function windColor(v) {
  if (v == null || !Number.isFinite(v)) return '#a8d5f0';
  if (v <= WIND_STOPS_CLIENT[0][0]) return WIND_STOPS_CLIENT[0][1];
  for (let i = 1; i < WIND_STOPS_CLIENT.length; i++) {
    if (v <= WIND_STOPS_CLIENT[i][0]) {
      const [v0, c0] = WIND_STOPS_CLIENT[i - 1];
      const [v1, c1] = WIND_STOPS_CLIENT[i];
      return mixHex(c0, c1, (v - v0) / (v1 - v0 || 1));
    }
  }
  return WIND_STOPS_CLIENT[WIND_STOPS_CLIENT.length - 1][1];
}

/* ------------------------------------------------------------------ *
 * derived data
 * ------------------------------------------------------------------ */

const rhr = () => (state.bundle && state.bundle.rhrread) || {};
const flw = () => (state.bundle && state.bundle.flw) || {};
const fnd = () => (state.bundle && state.bundle.fnd) || {};
const lunar = () => (state.bundle && state.bundle.lunar) || {};
const newsBag = () => (state.bundle && state.bundle.news) || {};

function warningList() {
  const w = (state.bundle && state.bundle.warnsum) || {};
  return (!w || Array.isArray(w)) ? [] : Object.values(w).filter((x) => x && typeof x === 'object');
}
function specialTips() {
  const s = state.bundle && state.bundle.swt;
  return (s && Array.isArray(s.swt)) ? s.swt : [];
}
function nineDays() {
  const f = fnd();
  return (f && Array.isArray(f.weatherForecast)) ? f.weatherForecast : [];
}
function tempStations() { return (rhr().temperature && rhr().temperature.data) || []; }
function rainStations() { return (rhr().rainfall && rhr().rainfall.data) || []; }

function heroStation() {
  const d = tempStations();
  return d.find((s) => /天文台|Observatory/i.test(s.place)) || d[0] || null;
}
function humidityValue() {
  const h = rhr().humidity;
  return (h && h.data && h.data[0]) ? h.data[0].value : null;
}
function uvValue() {
  const u = rhr().uvindex;
  const d = u && u.data && u.data[0];
  return d ? { value: d.value, desc: d.desc || '', place: d.place || '' } : null;
}
function lightningActive() {
  const d = (rhr().lightning && rhr().lightning.data) || [];
  return d.some((x) => String(x.occur).toLowerCase() === 'true');
}
function currentIcon() {
  const ic = rhr().icon;
  return Number(Array.isArray(ic) ? ic[0] : ic) || null;
}
function currentDesc() {
  const m = rhr().tcmessage;
  if (Array.isArray(m) && m.length) return m.filter(Boolean).join(' ');
  if (typeof m === 'string' && m.trim()) return m.trim();
  return flw().forecastDesc || '';
}
function iconUrl(n) { return n ? `/icons/pic${n}.png` : ''; }

/** min/max of today's 9-day entry */
function todayRange() {
  const days = nineDays();
  if (!days.length) return null;
  const d0 = days[0];
  return {
    min: d0.forecastMintemp ? d0.forecastMintemp.value : null,
    max: d0.forecastMaxtemp ? d0.forecastMaxtemp.value : null,
  };
}

/* ------------------------------------------------------------------ *
 * SVG schematic map of HK stations
 * ------------------------------------------------------------------ */

const MAP = { lonMin: 113.83, lonMax: 114.44, latMin: 22.14, latMax: 22.58, w: 760, h: 470 };

function project(lat, lon) {
  const x = (lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin) * MAP.w;
  const y = (MAP.latMax - lat) / (MAP.latMax - MAP.latMin) * MAP.h;
  return [x, y];
}

/* Stylised land outlines — approximate, for orientation only. */
const LAND = [
  [[113.845,22.255],[113.880,22.290],[113.930,22.300],[113.975,22.280],[114.010,22.250],
   [114.020,22.215],[113.995,22.190],[113.930,22.185],[113.870,22.200],[113.845,22.225]],
  [[114.125,22.285],[114.175,22.290],[114.235,22.275],[114.265,22.245],[114.255,22.205],
   [114.200,22.190],[114.150,22.200],[114.120,22.240]],
  [[114.145,22.340],[114.225,22.335],[114.235,22.300],[114.200,22.290],[114.155,22.295],[114.135,22.315]],
  [[113.930,22.290],[113.990,22.400],[114.040,22.470],[114.100,22.550],[114.200,22.560],
   [114.300,22.530],[114.400,22.480],[114.420,22.400],[114.360,22.340],[114.250,22.310],
   [114.150,22.295],[114.050,22.280],[113.970,22.260],[113.940,22.250]],
  [[114.100,22.220],[114.140,22.230],[114.145,22.200],[114.110,22.190]],
  [[114.020,22.045],[114.065,22.055],[114.070,22.020],[114.025,22.010]],
];

function renderMap(rows, kind, overlay, arrows) {
  const polys = LAND.map((ring) => {
    const pts = ring.map(([lon, lat]) => project(lat, lon).map((n) => n.toFixed(1)).join(',')).join(' ');
    return overlay
      /* with the raster beneath, keep only the coastline as a hint */
      ? `<polygon points="${pts}" fill="none" stroke="#8fa89a" stroke-width="0.8" opacity="0.75"/>`
      : `<polygon points="${pts}" fill="#e7efe4" stroke="#c3d4bb" stroke-width="1"/>`;
  }).join('');

  /* The analysis raster is placed by projecting its geographic bounds through
     the same equirectangular transform used for everything else, so it aligns
     with the markers by construction rather than by tuning. */
  let overlaySvg = '';
  if (overlay) {
    const [ox, oy] = project(overlay.north, overlay.west);
    const [ex, ey] = project(overlay.south, overlay.east);
    overlaySvg = `<image href="${esc(overlay.href)}" x="${ox.toFixed(2)}" y="${oy.toFixed(2)}"
      width="${(ex - ox).toFixed(2)}" height="${(ey - oy).toFixed(2)}"
      preserveAspectRatio="none" opacity="0.9"/>`;
  }

  /* Wind arrows. The meteorological direction is where the wind comes FROM, so
     the arrow is drawn pointing downwind (dir + 180). Length and colour both
     encode speed, because colour alone is unreliable for the colour-blind. */
  let arrowSvg = '';
  if (arrows && arrows.length) {
    arrowSvg = arrows.map((a) => {
      const [x, y] = project(a.lat, a.lon);
      const col = windColor(a.speed);
      const len = 7 + Math.min(13, a.speed * 0.45);
      const rad = ((a.dir + 180) * Math.PI) / 180;
      const ux = Math.sin(rad), uy = -Math.cos(rad);
      const x2 = x + ux * len, y2 = y + uy * len;
      const px = -uy, py = ux;
      const hl = 4, hw = 2.4;
      const tip = `${x2.toFixed(1)},${y2.toFixed(1)} ` +
                  `${(x2 - ux * hl + px * hw).toFixed(1)},${(y2 - uy * hl + py * hw).toFixed(1)} ` +
                  `${(x2 - ux * hl - px * hw).toFixed(1)},${(y2 - uy * hl - py * hw).toFixed(1)}`;
      return `<g class="war" data-speed="${a.speed}" data-dir="${a.dir}">` +
             `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x2 - ux * hl * 0.6).toFixed(1)}" y2="${(y2 - uy * hl * 0.6).toFixed(1)}" stroke="${col}" stroke-width="1.5"/>` +
             `<polygon points="${tip}" fill="${col}"/></g>`;
    }).join('');
  }

  const maxV = Math.max(...rows.map((r) => r.value), 1);
  const markers = rows.map((r) => {
    // Prefer coordinates carried on the row (the wind network is larger than the
    // temperature one and most of its marine stations have no name counterpart
    // in the station table); fall back to the name lookup.
    const c = (r.lat != null && r.lon != null) ? { lat: r.lat, lon: r.lon } : stationCoords(r.place);
    if (!c) return '';
    const [x, y] = project(c.lat, c.lon);
    const fill = kind === 'rain' ? rainColor(r.value)
               : kind === 'wind' ? windColor(r.value)
               : tempColor(r.value);
    const label = String(r.place);
    return `<g class="station" data-place="${esc(label)}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${fill}"/>
      <text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${esc(r.value)}</text>
      <text class="lbl" x="${x.toFixed(1)}" y="${(y + 23).toFixed(1)}" text-anchor="middle">${esc(label)}</text>
    </g>`;
  }).join('');

  return `<div class="mapwrap">
    <svg viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="${esc(t('mapTitle'))}">
      <rect width="${MAP.w}" height="${MAP.h}" fill="#dceef7"/>
      ${polys}
      ${overlaySvg}
      ${arrowSvg}
      ${markers}
    </svg>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * view: HOME — every homepage module, in the Observatory's order
 * ------------------------------------------------------------------ */

function moduleCard(titleKey, bodyHtml, note) {
  return `<section class="card">
    <h2 class="card__title">${esc(typeof titleKey === 'string' && t(titleKey) !== titleKey ? t(titleKey) : titleKey)}</h2>
    <div class="card__body">${bodyHtml}</div>
    ${note ? `<p class="card__note">${note}</p>` : ''}
  </section>`;
}

/* ------------------------------------------------------------------ *
 * parameter / station picker
 *
 * HKO's homepage carries two selects: one for the parameter, one for the
 * station. This is the same interaction over the open-data feed. Parameters the
 * open data feed does not publish (grass temperature, heat index, visibility,
 * MSL pressure, yesterday's extremes) are listed as unavailable rather than
 * silently omitted, so the gap is visible.
 * ------------------------------------------------------------------ */

/* Parameters that are genuinely *networks* in the open-data feed. The feed also
 * carries humidity and UV index, but each from a single station (the Observatory
 * and King's Park respectively) — offering those as networks renders a one-row
 * table that looks broken, so they are shown separately as point readings. */
const PICKER_PARAMS = [
  { k: 'temp', n: ['氣溫', '气温', 'Temperature'], unit: '°C', dp: 1 },
  { k: 'rain', n: ['過去一小時雨量', '过去一小时雨量', 'Rainfall, past hour'], unit: 'mm', dp: 1 },
  { k: 'wind', n: ['風向及風速', '风向及风速', 'Wind direction and speed'], unit: 'km/h', dp: 0 },
];

// Single-station readings — real, but not a spatial network.
const SINGLE_STATION = [
  { k: 'hum', n: ['相對濕度', '相对湿度', 'Relative humidity'], unit: '%', from: 'humidity' },
  { k: 'uv', n: ['紫外線指數', '紫外线指数', 'UV index'], unit: '', from: 'uvindex' },
];

// In HKO's own selector but not carried by the open-data feed at all.
const PICKER_UNAVAILABLE = [
  ['最高氣溫', '最高气温', 'Maximum temperature'],
  ['最低氣溫', '最低气温', 'Minimum temperature'],
  ['香港暑熱指數', '香港暑热指数', 'HK Heat Index'],
  ['草溫', '草温', 'Grass temperature'],
  ['能見度', '能见度', 'Visibility'],
  ['平均海平面氣壓', '平均海平面气压', 'Mean sea-level pressure'],
  ['過去二十四小時氣溫差別', '过去二十四小时气温差别', '24-hour temperature change'],
];

function pickerSeries(k) {
  const r = rhr();
  const bag = (o) => (o && o.data) || [];
  const num = (d, field) => {
    const v = Number(d[field]);
    return Number.isFinite(v) ? v : null;
  };
  switch (k) {
    case 'temp': return bag(r.temperature).map((d) => ({ place: d.place, value: num(d, 'value') }));
    case 'rain': return bag(r.rainfall).map((d) => ({ place: d.place, value: num(d, 'max') || 0 }));
    case 'wind': {
      const rows = (state.wind && state.wind.stations) || [];
      return rows.map((s) => ({
        place: s.station,
        value: s.speedKmh == null ? null : s.speedKmh,
        dir: s.calm ? t('calm') : (s.dirName || null),
      }));
    }
    default: return [];
  }
}

function singleStationRows(li) {
  const r = rhr();
  return SINGLE_STATION.map((s) => {
    const bag = (r[s.from] && r[s.from].data) || [];
    const d = bag[0];
    if (!d) return null;
    return `<div class="metric"><div class="metric__k">${esc(s.n[li])} · ${esc(d.place)}</div>
      <div class="metric__v">${esc(d.value)}<small>${esc(s.unit)}</small></div>
      ${d.desc ? `<div class="metric__sub">${esc(d.desc)}</div>` : ''}</div>`;
  }).filter(Boolean).join('');
}

function pickerCard() {
  const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);
  let p = PICKER_PARAMS.find((x) => x.k === state.picker.param);
  if (!p) { p = PICKER_PARAMS[0]; state.picker.param = p.k; }   // drop a stale key from an older session
  const series = pickerSeries(p.k).filter((s) => s.place);
  const valid = series.filter((s) => s.value != null);

  const places = [...new Set(series.map((s) => s.place))];
  if (state.picker.station && !places.includes(state.picker.station)) state.picker.station = null;
  const chosen = state.picker.station;

  const max = valid.length ? valid.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const min = valid.length ? valid.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const mean = valid.length ? valid.reduce((s, x) => s + x.value, 0) / valid.length : null;

  const rowFor = (s) => {
    const on = chosen && s.place === chosen;
    return `<tr class="${on ? 'row--selected' : ''}">
      <td><a href="#/regional" data-pick-jump="${esc(s.place)}">${esc(s.place)}</a></td>
      <td class="num">${s.value == null ? '—' : esc(s.value.toFixed(p.dp))}${p.unit ? ' ' + esc(p.unit) : ''}${s.dir ? ` <span class="side__ext">${esc(s.dir)}</span>` : ''}</td>
    </tr>`;
  };

  const ranked = [...valid].sort((a, b) => b.value - a.value).slice(0, 40);

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('pickerTitle'))}</h2>
      <div class="card__body">
        <div class="paramrow">
          <span class="paramrow__lab">${esc(t('pickerParam'))}</span>
          <select data-pick-param aria-label="${esc(t('pickerParam'))}">
            ${PICKER_PARAMS.map((x) => `<option value="${esc(x.k)}" ${x.k === p.k ? 'selected' : ''}>${esc(x.n[li])}</option>`).join('')}
          </select>

          <span class="paramrow__lab">${esc(t('pickerStation'))}</span>
          <select data-pick-station aria-label="${esc(t('pickerStation'))}">
            <option value="">${esc(t('pickerAll'))}</option>
            ${places.map((pl) => `<option value="${esc(pl)}" ${pl === chosen ? 'selected' : ''}>${esc(pl)}</option>`).join('')}
          </select>

          <span class="paramrow__hint">
            ${esc(t('pickerScope'))}: ${valid.length} ${esc(t('pickerStations'))}
            · ${esc(t('pickerMax'))} ${max ? esc(max.value.toFixed(p.dp)) : '—'}
            · ${esc(t('pickerMin'))} ${min ? esc(min.value.toFixed(p.dp)) : '—'}
            · ${esc(t('pickerMean'))} ${mean == null ? '—' : esc(mean.toFixed(p.dp))}
          </span>
        </div>

        <div class="tablewrap" style="margin-top:12px;max-height:280px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('colStation'))}</th><th style="text-align:right">${esc(p.n[li])}${p.unit ? ` (${esc(p.unit)})` : ''}</th></tr></thead>
            <tbody>${ranked.length ? ranked.map(rowFor).join('') : `<tr><td colspan="2" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>

        <p class="paramrow__hint" style="margin-top:10px">
          ${esc(t('pickerSingle'))}: ${SINGLE_STATION.map((s) => esc(s.n[li])).join(' · ')}
        </p>
        <div class="metrics" style="margin-top:8px">${singleStationRows(li)}</div>

        <p class="paramrow__hint" style="margin-top:10px">
          ${esc(t('pickerNotPublished'))}: ${PICKER_UNAVAILABLE.map((n) => esc(n[li])).join(' · ')}
        </p>
      </div>
      <p class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime((rhr().temperature || {}).recordTime))}</p>
    </section>`;
}

/** The wind feed is only needed when the picker asks for it, so fetch it lazily
 *  rather than on every page load. */
function ensureWind() {
  if (state.wind || state.windInFlight) return;
  state.windInFlight = fetch('/api/wind')
    .then((r) => r.json())
    .then((d) => { state.wind = d; state.windInFlight = null; renderAll(); })
    .catch(() => { state.windInFlight = null; });
}

function viewHome() {
  if (state.picker.param === 'wind') ensureWind();
  const st = heroStation();
  const range = todayRange();
  const uv = uvValue();
  const icon = currentIcon();
  const recTime = (rhr().temperature && rhr().temperature.recordTime) || rhr().updateTime;
  const f = flw();
  const tempRows = tempStations().map((d) => ({ place: d.place, value: Number(d.value) }));
  const rainRows = rainStations().map((d) => ({ place: d.place, value: Number(d.max) || 0 }));
  const whatsnew = (newsBag().whatsnew && newsBag().whatsnew.items) || [];

  /* --- ps0: current conditions + range + UV --- */
  const ps0 = `
    <section class="card">
      <h2 class="card__title">${esc(t('currentWx'))}</h2>
      <div class="card__body">
        <div class="hero">
          ${icon ? `<img class="hero__icon" src="${esc(iconUrl(icon))}" alt="" width="108" height="108">` : ''}
          <div>
            <div class="hero__temp">${st && st.value != null ? esc(st.value) : '—'}<sup>${esc(t('unitC'))}</sup></div>
            ${range ? `<div class="hero__range">${esc(t('maxTemp'))} <b>${esc(range.max)}${esc(t('unitC'))}</b> · ${esc(t('minTemp'))} <b>${esc(range.min)}${esc(t('unitC'))}</b></div>` : ''}
            <div class="hero__desc">${esc(st ? st.place : '—')}</div>
            <div class="hero__meta">${esc(t('recordTime'))}: ${esc(fmtTime(recTime))}</div>
          </div>
        </div>
        <p class="prose prose--muted" style="margin-top:14px">${esc(currentDesc())}</p>
        <div class="metrics" style="margin-top:14px">
          <div class="metric"><div class="metric__k">${esc(t('humidity'))}</div><div class="metric__v">${humidityValue() == null ? '—' : esc(humidityValue())}<small>${esc(t('unitPct'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('uvindex'))}</div><div class="metric__v">${uv ? esc(uv.value) : '—'}</div><div class="metric__sub">${esc(uv ? uv.desc : '')}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('lightning'))}</div><div class="metric__v">${lightningActive() ? '⚡' : '—'}</div></div>
        </div>
      </div>
    </section>`;

  /* --- ps2: regional map + station list --- */
  const ps2 = `
    <section class="card">
      <h2 class="card__title">${esc(t('regionalTemp'))}
        <span class="spacer">
          <button class="btn" data-dataset="temp" ${state.regional.dataset === 'temp' ? 'disabled' : ''}>${esc(t('chartTemp'))}</button>
          <button class="btn" data-dataset="rain" ${state.regional.dataset === 'rain' ? 'disabled' : ''}>${esc(t('chartRain'))}</button>
        </span>
      </h2>
      <div class="card__body">
        ${renderMap(state.regional.dataset === 'rain' ? rainRows : tempRows, state.regional.dataset === 'rain' ? 'rain' : 'temp', overlayFor())}
      </div>
      <p class="card__note">${esc(t('schematic'))} · ${esc(t('recordTime'))}: ${esc(fmtTime((rhr().temperature || {}).recordTime))}</p>
    </section>`;

  /* --- ps5: 9-day forecast carousel --- */
  const days = nineDays().map((d) => {
    const dt = parseCompactDate(d.forecastDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isToday = dt && dt.getTime() === today.getTime();
    const pic = d.ForecastIcon;
    const rh = (d.forecastMinRH && d.forecastMaxRH)
      ? `${esc(d.forecastMinRH.value)}-${esc(d.forecastMaxRH.value)}%` : '';
    return `<div class="fcarousel__item ${isToday ? 'fcarousel__item--today' : ''}">
      <div class="fcarousel__dow">${esc(isToday ? t('today') : d.week || '')}</div>
      <div class="fcarousel__date">${esc(fmtDM(d.forecastDate))}</div>
      ${pic ? `<img class="fcarousel__icon" src="${esc(iconUrl(pic))}" alt="" width="50" height="50">` : ''}
      <div class="fcarousel__temp">${d.forecastMintemp ? esc(d.forecastMintemp.value) : '—'} <span>| ${d.forecastMaxtemp ? esc(d.forecastMaxtemp.value) : '—'}${esc(t('unitC'))}</span></div>
      ${rh ? `<div class="fcarousel__hum">${rh}</div>` : ''}
      ${d.Confidence ? `<div class="fcarousel__conf">${esc(d.Confidence)}</div>` : ''}
    </div>`;
  }).join('');

  const ps5 = `
    <section class="card">
      <h2 class="card__title">${esc(t('nineDay'))}</h2>
      <div class="card__body">
        <div class="fcarousel">
          <button type="button" class="fcarousel__nav fcarousel__nav--prev" data-carousel="-1" aria-label="previous">‹</button>
          <div class="fcarousel__track" id="fcTrack">${days || `<p class="empty">${esc(t('pickerNoData'))}</p>`}</div>
          <button type="button" class="fcarousel__nav fcarousel__nav--next" data-carousel="1" aria-label="next">›</button>
        </div>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(fnd().updateTime))}</p>
    </section>`;

  /* --- ps6: imagery --- */
  const ps6 = `
    <section class="card">
      <h2 class="card__title">${esc(t('weatherImagery'))}</h2>
      <div class="card__body">
        <div class="imagery">
          <div class="imgcard"><div class="imgcard__h">${esc(t('satellite'))}</div><img src="/imagery/satellite" alt="${esc(t('satellite'))}" loading="lazy"></div>
          <div class="imgcard"><div class="imgcard__h">${esc(t('radar'))}</div><img src="/imagery/radar" alt="${esc(t('radar'))}" loading="lazy"></div>
          <div class="imgcard"><div class="imgcard__h">${esc(t('lightningImg'))}</div><img src="/imagery/lightning" alt="${esc(t('lightningImg'))}" loading="lazy"></div>
        </div>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(new Date().toISOString()))} · 1 min cache</p>
    </section>`;

  /* --- ps7: news --- */
  // Headlines only, rendered as text rather than links. The article bodies are
  // the Observatory's copyright, so they are neither copied nor deep-linked here.
  const newsHtml = whatsnew.length
    ? `<ul class="newslist">${whatsnew.map((n) => `<li><span class="newslist__h">${esc(n.text)}</span></li>`).join('')}</ul>`
    : `<p class="empty">${esc(t('noFeed'))} <a href="#/product/news">${esc(t('whyNoNews'))}</a></p>`;

  const ps7 = `
    <section class="card">
      <h2 class="card__title">${esc(t('latestNews'))}</h2>
      <div class="card__body">${newsHtml}</div>
      <p class="card__note">RSS: rss.weather.gov.hk · 30 min cache</p>
    </section>`;

  /* --- ps9: climate --- */
  const ps9 = `
    <section class="card">
      <h2 class="card__title">${esc(t('hkClimate'))}</h2>
      <div class="card__body">
        <p class="prose">${esc(t('climateSummary'))}: <a href="#/climate">${esc(t('climTemp'))}</a></p>
        ${f.generalSituation ? `<p class="prose prose--muted">${esc(f.generalSituation)}</p>` : ''}
      </div>
    </section>`;

  return ps0 + pickerCard() + ps2 + ps5 + ps6 + ps7 + ps9;
}

/* ------------------------------------------------------------------ *
 * view: OVERVIEW
 * ------------------------------------------------------------------ */

function viewOverview() {
  const st = heroStation();
  const range = todayRange();
  const uv = uvValue();
  const icon = currentIcon();
  const f = flw();
  const recTime = (rhr().temperature && rhr().temperature.recordTime) || rhr().updateTime;

  const heroCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('currentWx'))}</h2>
      <div class="card__body">
        <div class="hero">
          ${icon ? `<img class="hero__icon" src="${esc(iconUrl(icon))}" alt="" width="108" height="108">` : ''}
          <div>
            <div class="hero__temp">${st && st.value != null ? esc(st.value) : '—'}<sup>${esc(t('unitC'))}</sup></div>
            ${range ? `<div class="hero__range">${esc(t('maxTemp'))} <b>${esc(range.max)}${esc(t('unitC'))}</b> · ${esc(t('minTemp'))} <b>${esc(range.min)}${esc(t('unitC'))}</b></div>` : ''}
            <div class="hero__desc">${esc(st ? st.place : '—')}</div>
            <div class="hero__meta">${esc(t('recordTime'))}: ${esc(fmtTime(recTime))}</div>
          </div>
        </div>
        <p class="prose prose--muted" style="margin-top:14px">${esc(currentDesc())}</p>
      </div>
    </section>`;

  const flwCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('flwTitle'))}</h2>
      <div class="card__body">
        <p class="prose"><b>${esc(t('generalSituation'))}:</b> ${esc(f.generalSituation || '—')}</p>
        <p class="prose"><b>${esc(f.forecastPeriod || t('forecastPeriod'))}:</b> ${esc(f.forecastDesc || '—')}</p>
        <p class="prose"><b>${esc(t('outlook'))}:</b> ${esc(f.outlook || '—')}</p>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(f.updateTime))}</p>
    </section>`;

  const metrics = `
    <section class="card">
      <h2 class="card__title">${esc(t('currentWx'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('humidity'))}</div><div class="metric__v">${humidityValue() == null ? '—' : esc(humidityValue())}<small>${esc(t('unitPct'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('uvindex'))}</div><div class="metric__v">${uv ? esc(uv.value) : '—'}</div><div class="metric__sub">${esc(uv ? uv.desc : '')}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('maxTemp'))}</div><div class="metric__v">${range ? esc(range.max) : '—'}<small>${esc(t('unitC'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('minTemp'))}</div><div class="metric__v">${range ? esc(range.min) : '—'}<small>${esc(t('unitC'))}</small></div></div>
        </div>
      </div>
    </section>`;

  return heroCard + `<div class="grid grid--2">${flwCard}${metrics}</div>`;
}

/* ------------------------------------------------------------------ *
 * view: REGIONAL (table + 3-D chart)
 * ------------------------------------------------------------------ */

function regionalRows() {
  const s = state.regional;
  const filter = (s.filter || '').trim();
  if (s.dataset === 'rain') {
    let rows = rainStations().map((d) => ({ place: d.place, value: Number(d.max) || 0, min: d.min == null ? null : Number(d.min) }));
    if (filter) rows = rows.filter((r) => r.place.includes(filter));
    const dir = s.sortDirRain === 'asc' ? 1 : -1;
    rows.sort((a, b) => (a.value - b.value) * dir || a.place.localeCompare(b.place));
    return { rows, unit: t('unitMm'), kind: 'rain' };
  }
  let rows = tempStations().map((d) => ({ place: d.place, value: Number(d.value) }));
  if (filter) rows = rows.filter((r) => r.place.includes(filter));
  const dir = s.sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => (a.value - b.value) * dir || a.place.localeCompare(b.place));
  return { rows, unit: t('unitC'), kind: 'temp' };
}

function viewRegional() {
  const { rows, unit, kind } = regionalRows();
  const isRain = kind === 'rain';
  const arrow = (dir) => `<span class="arrow">${dir === 'asc' ? '▲' : '▼'}</span>`;

  const body = rows.map((r) => {
    const chip = isRain ? rainColor(r.value) : tempColor(r.value);
    return `<tr>
      <td>${esc(r.place)}</td>
      <td class="num"><span class="tempchip" style="background:${chip}">${esc(r.value)}</span> <small style="color:#888">${esc(unit)}</small></td>
      ${isRain ? `<td class="num">${r.min == null ? '—' : esc(r.min)}</td>` : ''}
    </tr>`;
  }).join('');

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('mapTitle'))}</h2>
      <div class="card__body">${renderMap(rows, kind, overlayFor())}</div>
      <p class="card__note">${esc(t('schematic'))}</p>
    </section>

    <section class="card">
      <h2 class="card__title">${esc(isRain ? t('regionalRain') : t('regionalTemp'))}
        <span class="spacer">
          <button class="btn" data-dataset="temp" ${!isRain ? 'disabled' : ''}>${esc(t('chartTemp'))}</button>
          <button class="btn" data-dataset="rain" ${isRain ? 'disabled' : ''}>${esc(t('chartRain'))}</button>
        </span>
      </h2>
      <div class="card__body">
        <div class="chartbox"><canvas id="chart3d"></canvas></div>
      </div>
      <div class="chartlegend">
        <span>${esc(isRain ? t('chartTitleRain') : t('chartTitle'))}</span>
        <span>${esc(t('chartHint'))}</span>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">${esc(t('station'))} · ${rows.length} ${esc(t('records'))}</h2>
      <div class="card__body">
        <div class="mapselect" style="margin-bottom:10px">
          <button class="btn" id="locateBtn" type="button">${esc(t('locate'))}</button>
          ${state.regional.filter ? `<span class="empty">「${esc(state.regional.filter)}」 <button class="btn" id="clearFilter" type="button">✕</button></span>` : ''}
        </div>
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr>
              <th class="sortable" data-sort="place">${esc(t('station'))}</th>
              <th class="sortable" data-sort="value" style="text-align:right">${esc(t('temp'))} ${arrow(isRain ? state.regional.sortDirRain : state.regional.sortDir)}</th>
              ${isRain ? `<th class="num" style="text-align:right">${esc(t('minRain'))}</th>` : ''}
            </tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime((rhr().temperature || {}).recordTime))}</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * view: IMAGERY
 * ------------------------------------------------------------------ */

function viewImagery() {
  const card = (src, title) => `
    <div class="imgcard">
      <div class="imgcard__h">${esc(title)}</div>
      <img src="${src}" alt="${esc(title)}">
      <div class="imgcard__f">${esc(t('updated'))}: ${esc(fmtTime(new Date().toISOString()))}</div>
    </div>`;
  return `
    <section class="card">
      <h2 class="card__title">${esc(t('weatherImagery'))}</h2>
      <div class="card__body">
        <div class="imagery">
          ${card('/imagery/satellite', t('satellite'))}
          ${card('/imagery/radar', t('radar'))}
          ${card('/imagery/lightning', t('lightningImg'))}
        </div>
      </div>
      <p class="card__note">Proxied live from the Observatory's public product endpoints · 60 s cache</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * view: 9-DAY
 * ------------------------------------------------------------------ */

function viewForecast() {
  const days = nineDays();
  const f = fnd();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cards = days.map((d) => {
    const dt = parseCompactDate(d.forecastDate);
    const isToday = dt && dt.getTime() === today.getTime();
    const pic = d.ForecastIcon;
    return `<div class="day ${isToday ? 'day--today' : ''}">
      <div class="day__dow">${esc(isToday ? t('today') : d.week || '')}</div>
      <div class="day__date">${esc(fmtDM(d.forecastDate))}</div>
      ${pic ? `<img class="day__icon" src="${esc(iconUrl(pic))}" alt="" width="52" height="52" loading="lazy">` : ''}
      <div class="day__temp">${d.forecastMintemp ? esc(d.forecastMintemp.value) : '—'} <span>– ${d.forecastMaxtemp ? esc(d.forecastMaxtemp.value) : '—'}${esc(t('unitC'))}</span></div>
      <div class="day__wx">${esc(d.forecastWeather || '')}</div>
      <div class="day__extra">
        <div>${esc(t('maxRH'))} ${d.forecastMaxrh ? esc(d.forecastMaxrh.value) : '—'}${esc(t('unitPct'))} · ${esc(t('minRH'))} ${d.forecastMinrh ? esc(d.forecastMinrh.value) : '—'}${esc(t('unitPct'))}</div>
        ${d.PSR ? `<div>${esc(t('rainProb'))}: ${esc(d.PSR)}</div>` : ''}
        ${d.forecastWind ? `<div>${esc(t('wind'))}: ${esc(d.forecastWind)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const sea = f.seaTemp;
  const soil = Array.isArray(f.soilTemp) ? f.soilTemp : [];

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('generalSituation'))}</h2>
      <div class="card__body"><p class="prose">${esc(f.generalSituation || '—')}</p></div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(f.updateTime))}</p>
    </section>
    <section class="card">
      <h2 class="card__title">${esc(t('nineDay'))}</h2>
      <div class="card__body"><div class="days">${cards || '<p class="empty">—</p>'}</div></div>
    </section>
    <div class="grid grid--2">
      <section class="card">
        <h2 class="card__title">${esc(t('seaTemp'))}</h2>
        <div class="card__body">${sea ? `<p class="prose">${esc(sea.place)}: <b>${esc(sea.value)}${esc(t('unitC'))}</b></p><p class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime(sea.recordTime))}</p>` : '<p class="empty">—</p>'}</div>
      </section>
      <section class="card">
        <h2 class="card__title">${esc(t('soilTemp'))}</h2>
        <div class="card__body">${soil.length ? soil.map((s) => `<p class="prose">${esc(s.place)}: <b>${esc(s.value)}${esc(t('unitC'))}</b> <span class="card__note">${esc(fmtTime(s.recordTime))}</span></p>`).join('') : '<p class="empty">—</p>'}</div>
      </section>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * view: ALERTS
 * ------------------------------------------------------------------ */

function severityOf(code) {
  const c = String(code || '').toUpperCase();
  if (/^(WRB|WRC|TC9|TC10|WT)$/.test(c)) return 'severe';
  if (/^(WRA|TC1|TC3|TC8[A-Z]{0,2}|WMS|WSS|WL|WLS)$/.test(c)) return 'warn';
  return 'info';
}

function viewAlerts() {
  const list = warningList();
  const tips = specialTips();
  const info = Array.isArray(state.bundle && state.bundle.warningInfo) ? state.bundle.warningInfo : [];
  const f = flw();

  const warnHtml = list.length
    ? list.map((w) => `<div class="alert ${severityOf(w.code) === 'severe' ? 'alert--severe' : ''}">
        <p class="alert__h">${esc(w.name || w.code || '—')}</p>
        <p class="alert__b">${esc(w.code || '')}${w.actionCode ? ' · ' + esc(w.actionCode) : ''}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(w.updateTime || w.issueTime))}</p>
      </div>`).join('')
    : `<p class="empty">${esc(t('noWarning'))}</p>`;

  const infoHtml = info.length
    ? info.map((w) => `<div class="alert alert--info">
        <p class="alert__h">${esc(w.warningStatementCode || '—')}</p>
        <p class="alert__b">${(w.contents || []).map((c) => esc(c)).join('<br>')}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(w.updateTime))}</p>
      </div>`).join('')
    : '';

  const tipsHtml = tips.length
    ? tips.map((s) => `<div class="alert">
        <p class="alert__b">${esc(s.desc || '')}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(s.updateTime))}</p>
      </div>`).join('')
    : `<p class="empty">${esc(t('noTip'))}</p>`;

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('alertsTitle'))}</h2>
      <div class="card__body">${warnHtml}${infoHtml}</div>
    </section>
    <section class="card">
      <h2 class="card__title">${esc(t('specialTips'))}</h2>
      <div class="card__body">${tipsHtml}</div>
    </section>
    <section class="card">
      <h2 class="card__title">${esc(t('fireDanger'))}</h2>
      <div class="card__body">
        <p class="prose">${esc(f.fireDangerWarning || t('noWarning'))}</p>
        ${f.tcInfo ? `<p class="prose">${esc(f.tcInfo)}</p>` : ''}
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(f.updateTime))}</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * view: NEWS
 * ------------------------------------------------------------------ */

function viewNews() {
  const bag = newsBag();
  const block = (key, titleKey) => {
    const entry = bag[key] || {};
    const items = entry.items || [];
    // Headlines as text: the bodies are the Observatory's copyright.
    const inner = items.length
      ? `<ul class="newslist">${items.map((n) => `<li><span class="newslist__h">${esc(n.text)}</span></li>`).join('')}</ul>`
      : `<p class="empty">${esc(t('noFeed'))}</p>`;
    return `<section class="card">
      <h2 class="card__title">${esc(t(titleKey))}</h2>
      <div class="card__body">${inner}</div>
      <p class="card__note">RSS: rss.weather.gov.hk · ${esc(t('headlinesOnly'))}</p>
    </section>`;
  };
  return block('whatsnew', 'latestNews') + block('blog', 'weatherBlog')
       + block('hkonews', 'hkoUpdates') + block('forecaster_blog', 'hkoBlog');
}

/* ------------------------------------------------------------------ *
 * view: ANALYSIS (high-resolution post-processed field)
 * ------------------------------------------------------------------ */

function viewAnalysis() {
  const a = state.analysis;

  if (!a) {
    // no result yet: only claim failure if one actually happened
    return `<section class="card">
      <h2 class="card__title">${esc(state.analysisError ? t('errorTitle') : t('analysisTitle'))}</h2>
      <div class="card__body">
        ${state.analysisError
          ? `<p class="empty">${esc(state.analysisError)}</p>`
          : `<p class="prose">${esc(t('analysisPending'))}</p>
             <div class="skeleton" style="width:70%"></div>
             <div class="skeleton" style="width:45%"></div>
             <div class="skeleton" style="width:58%"></div>`}
        <button class="btn" data-analysis-refresh type="button">${esc(t('refreshAnalysis'))}</button>
      </div></section>`;
  }

  const tempRows = tempStations().map((d) => ({ place: d.place, value: Number(d.value) }));

  /* --- the product --- */
  const mapCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('analysisTitle'))}
        <span class="spacer">
          <button class="btn" data-overlay-toggle type="button">${esc(state.showOverlay ? t('hideOverlay') : t('showOverlay'))}</button>
          <button class="btn" data-analysis-refresh type="button" ${state.analysisLoading ? 'disabled' : ''}>${esc(t('refreshAnalysis'))}</button>
        </span>
      </h2>
      <div class="card__body">
        ${renderMap(tempRows, 'temp', overlayFor())}
        <div class="chartlegend">
          <span>${esc(t('analysisSub'))}</span>
          <span>${a.grid.cols}×${a.grid.rows} &#64; ${a.grid.metresPerCell} m</span>
          <span>${esc(a.grid.west.toFixed(3))}–${esc(a.grid.east.toFixed(3))}°E, ${esc(a.grid.south.toFixed(3))}–${esc(a.grid.north.toFixed(3))}°N</span>
        </div>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(a.generatedAt))} · ${esc(t('recordTime'))}: ${esc(fmtTime(a.observationTime))} · PNG ${a.raster.bytes} bytes</p>
    </section>`;

  /* --- estimator comparison: the actual finding --- */
  const estRows = a.estimators.map((e) => `
    <tr class="${e.selected ? 'row--selected' : ''}">
      <td>${esc(e.label)}${e.selected ? ` <strong>← ${esc(t('selectedTag'))}</strong>` : ''}</td>
      <td class="num">${e.rmse.toFixed(2)}</td>
      <td class="num">${e.mae.toFixed(2)}</td>
      <td class="num">${e.bias >= 0 ? '+' : ''}${e.bias.toFixed(2)}</td>
      <td class="num">${e.maxError.toFixed(2)}</td>
    </tr>`).join('');

  const estCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('methodTitle'))} — ${esc(t('estimator'))}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr>
              <th>${esc(t('estimator'))}</th>
              <th style="text-align:right">${esc(t('rmse'))} (K)</th>
              <th style="text-align:right">${esc(t('mae'))} (K)</th>
              <th style="text-align:right">${esc(t('bias'))} (K)</th>
              <th style="text-align:right">${esc(t('maxErr'))} (K)</th>
            </tr></thead>
            <tbody>${estRows}</tbody>
          </table>
        </div>
        <p class="card__note">${esc(t('looNote'))}</p>
      </div>
    </section>`;

  /* --- why the correction did or did not help --- */
  const n = a.network;
  const whyNote = !n.spansRelief ? t('lowlandNote')
                : a.correctionHelped ? t('spansNote')
                : t('looNote');

  const whyCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('networkTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('stationCount'))}</div><div class="metric__v">${n.stations}<small>/${n.configured}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('elevSpan'))}</div><div class="metric__v">${n.elevationSpan}<small>m</small></div><div class="metric__sub">${n.elevationMin}–${n.elevationMax} m</div></div>
          <div class="metric"><div class="metric__k">${esc(t('gridRes'))}</div><div class="metric__v">${a.grid.metresPerCell}<small>m</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('variogramTitle'))} ${esc(t('range'))}</div><div class="metric__v">${(a.variogram.range / 1000).toFixed(1)}<small>km</small></div><div class="metric__sub">${esc(t('nugget'))} ${a.variogram.nugget.toFixed(3)} · ${esc(t('sill'))} ${a.variogram.sill.toFixed(3)}</div></div>
        </div>
        <p class="prose prose--muted" style="margin-top:12px">${esc(whyNote)}</p>
      </div>
    </section>`;

  /* --- field statistics --- */
  const f = a.field;
  const fieldCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('fieldTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('minTemp'))}</div><div class="metric__v">${f.min.toFixed(1)}<small>${esc(t('unitC'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('maxTemp'))}</div><div class="metric__v">${f.max.toFixed(1)}<small>${esc(t('unitC'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('temp'))} (mean)</div><div class="metric__v">${f.mean.toFixed(1)}<small>${esc(t('unitC'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('district'))} cells</div><div class="metric__v">${f.cells.toLocaleString()}</div></div>
        </div>
      </div>
    </section>`;

  return mapCard + `<div class="grid grid--2">${estCard}${whyCard}</div>` + fieldCard;
}

/* ------------------------------------------------------------------ *
 * view: LAE operations assessment
 * ------------------------------------------------------------------ */

const VERDICT_CLASS = { 'GO': 'verdict--go', 'CAUTION': 'verdict--caution', 'NO-GO': 'verdict--nogo', 'UNKNOWN': 'verdict--unknown' };
const VERDICT_LABEL = { 'GO': 'vGo', 'CAUTION': 'vCaution', 'NO-GO': 'vNoGo', 'UNKNOWN': 'vUnknown' };

function viewLae() {
  const d = state.lae;

  if (!d) {
    return `<section class="card">
      <h2 class="card__title">${esc(state.laeError ? t('errorTitle') : t('laeTitle'))}</h2>
      <div class="card__body">
        ${state.laeError
          ? `<p class="empty">${esc(state.laeError)}</p>`
          : `<p class="prose">${esc(t('analysisPending'))}</p>
             <div class="skeleton" style="width:70%"></div>
             <div class="skeleton" style="width:50%"></div>`}
        <button class="btn" data-lae-refresh type="button">${esc(t('refreshAnalysis'))}</button>
      </div></section>`;
  }

  const a = d.assessment;

  /* --- verdict --- */
  const verdictCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('laeTitle'))}
        <span class="spacer">
          <button class="btn" data-lae-refresh type="button" ${state.laeLoading ? 'disabled' : ''}>${esc(t('refreshAnalysis'))}</button>
        </span>
      </h2>
      <div class="card__body">
        <div class="verdict ${VERDICT_CLASS[a.overall] || 'verdict--unknown'}">
          <span class="verdict__badge">${esc(t(VERDICT_LABEL[a.overall] || 'vUnknown'))}</span>
          <span class="verdict__text">${esc(a.summary)}</span>
        </div>
        <div class="metrics" style="margin-top:14px">
          <div class="metric">
            <div class="metric__k">${esc(t('altitudeL'))}</div>
            <div class="metric__v">${a.altitudeM}<small>m AGL</small></div>
            <div class="metric__sub">${esc(t('altNote'))}</div>
          </div>
          <div class="metric"><div class="metric__k">${esc(t('factors'))}</div><div class="metric__v">${a.factors.length}</div>
            <div class="metric__sub">${a.blockers.length} blocker(s), ${a.cautions.length} caution(s)</div></div>
          <div class="metric"><div class="metric__k">${esc(t('windNet'))}</div>
            <div class="metric__v">${d.wind.network.usable}<small>/${d.wind.network.reported}</small></div>
            <div class="metric__sub">${esc(t('speedRmse'))} ${d.wind.validation.speedRmseKmh} km/h</div></div>
        </div>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(d.generatedAt))} ·
        ${esc(t('rawReport'))}: wind ${esc(fmtTime(d.observationTimes.windNetwork))}, METAR ${esc(fmtTime(d.observationTimes.metar))}</p>
    </section>`;

  /* --- factors --- */
  const factorRows = a.factors.map((f) => {
    const val = f.value == null ? '—'
      : typeof f.value === 'boolean' ? (f.value ? '✓' : '—')
      : `${f.value}${f.unit ? ' ' + f.unit : ''}`;
    const thr = f.threshold == null ? '—'
      : typeof f.threshold === 'object'
        ? Object.entries(f.threshold).map(([k, v]) => `${k} ${v}`).join(' / ')
        : String(f.threshold);
    return `<tr class="${f.status === 'NO-GO' ? 'row--nogo' : f.status === 'CAUTION' ? 'row--caution' : ''}">
      <td>${esc(f.label)}</td>
      <td class="num">${esc(val)}</td>
      <td class="num" style="color:#7b8a9c;font-size:12.5px">${esc(thr)}</td>
      <td><span class="pill pill--${f.status.toLowerCase().replace('-', '')}">${esc(f.status)}</span></td>
    </tr>`;
  }).join('');

  const factorCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('factors'))}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr>
              <th>${esc(t('fFactor'))}</th>
              <th style="text-align:right">${esc(t('fValue'))}</th>
              <th style="text-align:right">${esc(t('fThreshold'))}</th>
              <th>${esc(t('fStatus'))}</th>
            </tr></thead>
            <tbody>${factorRows}</tbody>
          </table>
        </div>
      </div>
    </section>`;

  /* --- wind map --- */
  const windRows = d.wind.stations.map((s) => ({
    place: state.lang === 'en' ? s.station : (s.tc || s.station),
    value: s.speedKmh, lat: s.lat, lon: s.lon,
  }));
  const windCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('windField'))}</h2>
      <div class="card__body">
        ${renderMap(windRows, 'wind', null, d.wind.arrows)}
        <div class="chartlegend">
          <span>${d.wind.arrows.length} ${esc(t('windArrows'))}</span>
          <span>${esc(t('windField'))} ${d.wind.field.speedMinKmh}–${d.wind.field.speedMaxKmh} km/h (mean ${d.wind.field.speedMeanKmh})</span>
          <span>${esc(t('vecValidation'))}: ${esc(t('speedRmse'))} ${d.wind.validation.speedRmseKmh} km/h, ${esc(t('dirMae'))} ${d.wind.validation.dirMaeDeg}° &ge;${d.wind.validation.minDirSpeedKmh} km/h</span>
        </div>
      </div>
      <p class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime(d.wind.observedAt))} ·
        u/v interpolated separately, recombined — direction is never interpolated as a scalar</p>
    </section>`;

  /* --- stations --- */
  const stationRows = [...d.wind.stations].sort((x, y) => y.speedKmh - x.speedKmh).map((s) => `
    <tr>
      <td>${esc(s.station)}</td>
      <td>${esc(s.dirName)} <small style="color:#7b8a9c">${s.dirDeg != null ? s.dirDeg + '°' : ''}</small></td>
      <td class="num">${s.speedKmh}</td>
      <td class="num">${s.gustKmh == null ? '—' : s.gustKmh}</td>
      <td class="num">B${s.beaufort}</td>
    </tr>`).join('');

  const stationCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('windNet'))} · ${d.wind.stations.length}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr>
              <th>${esc(t('station'))}</th><th>${esc(t('wind'))}</th>
              <th style="text-align:right">km/h</th>
              <th style="text-align:right">${esc(t('gust'))}</th>
              <th style="text-align:right">Bft</th>
            </tr></thead>
            <tbody>${stationRows}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${d.wind.network.dropped.length} station(s) excluded:
        ${d.wind.network.dropped.map((x) => `${esc(x.station)} (${esc(x.reason)})`).join('; ') || 'none'}</p>
    </section>`;

  /* --- METAR / TAF --- */
  const aviationCard = (() => {
    const m = d.metar, tf = d.taf;
    const metarBlock = m ? `
      <p class="prose"><b>${esc(t('metarTitle'))}</b> · ${esc(m.station)} ·
        ${esc(t('flightCat'))} <code>${esc(m.flightCategory)}</code></p>
      <pre class="rawbox">${esc(m.raw)}</pre>
      <div class="metrics">
        <div class="metric"><div class="metric__k">${esc(t('surfaceWind'))}</div>
          <div class="metric__v">${m.wind.dirDeg == null ? 'VRB' : m.wind.dirDeg + '°'}<small>/${m.wind.speedKt} kt</small></div>
          <div class="metric__sub">${m.wind.gustKt ? 'G' + m.wind.gustKt + ' kt gust' : 'no gust reported'}</div></div>
        <div class="metric"><div class="metric__k">${esc(t('visibility'))}</div>
          <div class="metric__v">${(m.visibility.metres / 1000).toFixed(1)}<small>km</small></div>
          <div class="metric__sub">${m.visibility.atLeast ? '10 km or more' : ''}</div></div>
        <div class="metric"><div class="metric__k">${esc(t('ceiling'))}</div>
          <div class="metric__v">${m.ceilingFt == null ? '—' : m.ceilingFt}<small>${m.ceilingFt == null ? '' : 'ft'}</small></div>
          <div class="metric__sub">${m.ceilingFt == null ? 'no BKN/OVC' : ''}</div></div>
        <div class="metric"><div class="metric__k">T / Td</div>
          <div class="metric__v">${m.temperatureC}/${m.dewpointC}<small>${esc(t('unitC'))}</small></div>
          <div class="metric__sub">Q${m.qnhHpa}</div></div>
      </div>` : '<p class="empty">METAR unavailable</p>';

    const tafBlock = tf ? `
      <p class="prose" style="margin-top:18px"><b>${esc(t('tafTitle'))}</b> · ${esc(tf.station)} ·
        ${esc(t('opWindow'))} ${esc(fmtTime(tf.validity.from))} – ${esc(fmtTime(tf.validity.to))}</p>
      <div class="tablewrap">
        <table class="tbl">
          <thead><tr><th>Type</th><th>Window</th><th>Wind</th><th>Vis</th><th>Wx</th></tr></thead>
          <tbody>
            <tr><td>BASE</td><td>${esc(fmtTime(tf.validity.from))}–${esc(fmtTime(tf.validity.to))}</td>
              <td>${tf.base.wind ? esc(tf.base.wind.dirDeg + '@' + tf.base.wind.speedKt + 'kt') : '—'}</td>
              <td>${tf.base.visibility ? tf.base.visibility.metres + ' m' : '—'}</td>
              <td>${tf.base.weather.map((w) => esc(w.raw)).join(' ') || '—'}</td></tr>
            ${tf.groups.map((g) => `<tr>
              <td>${esc(g.type)}${g.prob ? ' ' + g.prob + '%' : ''}</td>
              <td>${esc(fmtTime(g.from))}–${esc(fmtTime(g.to))}</td>
              <td>${g.wind ? esc(g.wind.dirDeg + '@' + g.wind.speedKt + (g.wind.gustKt ? 'G' + g.wind.gustKt : '') + 'kt') : '—'}</td>
              <td>${g.visibility ? g.visibility.metres + ' m' : '—'}</td>
              <td>${g.weather.map((w) => esc(w.raw)).join(' ') || '—'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="card__note">worst case over validity: wind
        ${tf.worstCase.wind ? esc(tf.worstCase.wind.dirDeg + '@' + tf.worstCase.wind.speedKt + (tf.worstCase.wind.gustKt ? 'G' + tf.worstCase.wind.gustKt : '') + 'kt') : '—'},
        vis ${tf.worstCase.visibility ? tf.worstCase.visibility.metres + ' m' : '—'},
        ceiling ${tf.worstCase.ceilingFt == null ? '—' : tf.worstCase.ceilingFt + ' ft'},
        thunder ${tf.worstCase.thunder ? 'yes' : 'no'}</p>` : '<p class="empty">TAF unavailable</p>';

    return `<section class="card">
      <h2 class="card__title">${esc(t('metarTitle'))} / ${esc(t('tafTitle'))}</h2>
      <div class="card__body">${metarBlock}${tafBlock}</div>
    </section>`;
  })();

  /* --- thresholds, with the caveat stated --- */
  const thrRows = Object.entries(d.thresholds).map(([k, v]) => `
    <tr><td>${esc(k)}</td><td class="num">${Object.entries(v).map(([a, b]) => `${esc(a)} ${b}`).join(' / ')}</td></tr>`).join('');

  const thrCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('thresholdsTitle'))}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl"><thead><tr><th>${esc(t('fFactor'))}</th><th style="text-align:right">km/h · m · ft</th></tr></thead>
          <tbody>${thrRows}</tbody></table>
        </div>
        <p class="prose prose--muted" style="margin-top:12px"><strong>${esc(t('notStandard'))}</strong></p>
      </div>
    </section>`;

  return verdictCard + `<div class="grid grid--2">${factorCard}${stationCard}</div>`
       + windCard + aviationCard + thrCard;
}

const ISO = { cos: 0.98, kx: 0.16, kz: 0.5 };
const isoProject = (x, y, z) => [(x - z) * ISO.cos, x * ISO.kx + z * ISO.kz - y];

function draw3DChart(canvas, items) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 900;
  const H = canvas.clientHeight || 400;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  if (!items.length) {
    g.fillStyle = '#888'; g.font = '14px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('—', W / 2, H / 2); state.chart.box = null; return;
  }

  const maxV = Math.max(...items.map((d) => d.value), 1);
  const minV = Math.min(...items.map((d) => d.value), 0);
  const BAR_W = 30, BAR_D = 30, GAP = 26, MAX_H = 220;
  const step = BAR_W + GAP;

  const bars = items.map((d, i) => {
    const norm = maxV === minV ? 1 : (d.value - minV) / (maxV - minV);
    const h = Math.max(6, norm * MAX_H + 6);
    const x0 = i * step, x1 = x0 + BAR_W, z0 = 0, z1 = z0 + BAR_D;
    const base = d.color || '#3b7cba';
    const P = isoProject;
    return {
      item: d,
      faces: [
        { pts: [P(x0,h,z0), P(x1,h,z0), P(x1,h,z1), P(x0,h,z1)], fill: shade(base, 0.30) },
        { pts: [P(x1,0,z0), P(x1,h,z0), P(x1,h,z1), P(x1,0,z1)], fill: shade(base, -0.16) },
        { pts: [P(x0,0,z1), P(x0,h,z1), P(x1,h,z1), P(x1,0,z1)], fill: shade(base, -0.34) },
      ],
      top: P((x0 + x1) / 2, h, (z0 + z1) / 2),
      base: P((x0 + x1) / 2, 0, (z0 + z1) / 2),
    };
  });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of bars) {
    for (const f of b.faces) for (const [px, py] of f.pts) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }

  const PAD_L = 20, PAD_R = 20, PAD_T = 36, PAD_B = 66;
  const s = Math.min((W - PAD_L - PAD_R) / (maxX - minX || 1), (H - PAD_T - PAD_B) / (maxY - minY || 1));
  const ox = PAD_L - minX * s, oy = PAD_T - minY * s;
  const toScreen = ([px, py]) => [ox + px * s, oy + py * s];

  const hitboxes = [];
  for (const b of bars) {
    for (const f of b.faces) {
      const pts = f.pts.map(toScreen);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillStyle = f.fill;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.lineWidth = 1;
      g.stroke();
    }
    const [tX, tY] = toScreen(b.top);
    const [bX, bY] = toScreen(b.base);
    hitboxes.push({ topX: tX, topY: tY, item: b.item });

    g.fillStyle = '#000';
    g.font = '700 11.5px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(String(b.item.value), tX, tY - 6);

    g.save();
    g.translate(bX, bY + 8);
    g.rotate(-Math.PI / 5);
    g.fillStyle = '#3e5259';
    g.font = '11px Arial, "Microsoft JhengHei", sans-serif';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    const lbl = String(b.item.label);
    g.fillText(lbl.length > 8 ? lbl.slice(0, 8) + '…' : lbl, 0, 0);
    g.restore();
  }

  state.chart.box = { hitboxes };
  state.chart.items = items;
  drawHover(g);
}

function drawHover(g) {
  const h = state.chart.hover;
  if (!h) return;
  g.save();
  g.beginPath(); g.arc(h.x, h.y, 7, 0, Math.PI * 2);
  g.fillStyle = 'rgba(27,83,151,.95)'; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();

  const text = `${h.item.label}  ${h.item.value}${h.suffix || ''}`;
  g.font = '700 12.5px Arial, sans-serif';
  const w = g.measureText(text).width + 18;
  let x = h.x + 12, y = h.y - 16;
  const cv = state.chart.canvas;
  if (cv && x + w > cv.clientWidth - 6) x = h.x - w - 12;
  g.fillStyle = 'rgba(0,0,0,.9)';
  g.beginPath();
  const r = 5;
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + 26, r);
  g.arcTo(x + w, y + 26, x, y + 26, r);
  g.arcTo(x, y + 26, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(text, x + 9, y + 13);
  g.restore();
}

function redrawChart() {
  const cv = state.chart.canvas;
  if (!cv || !document.body.contains(cv)) return;
  draw3DChart(cv, state.chart.items);
}

function bindChart(canvas, items) {
  state.chart.canvas = canvas;
  const onMove = (ev) => {
    const box = state.chart.box;
    if (!box) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    let best = null, bestD = Infinity;
    for (const hb of box.hitboxes) {
      const d = Math.hypot(hb.topX - mx, hb.topY - my);
      if (d < bestD) { bestD = d; best = hb; }
    }
    if (best && bestD < 44) {
      if (state.chart.hover && state.chart.hover.item === best.item) return;
      state.chart.hover = { x: best.topX, y: best.topY, item: best.item, suffix: best.item.unitSuffix || '' };
    } else {
      if (!state.chart.hover) return;
      state.chart.hover = null;
    }
    redrawChart();
  };
  const onLeave = () => { if (state.chart.hover) { state.chart.hover = null; redrawChart(); } };
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', onResizeDebounced);
}

let resizeTimer = null;
function onResizeDebounced() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(redrawChart, 160);
}

/* ------------------------------------------------------------------ *
 * chrome
 * ------------------------------------------------------------------ */

function renderDatebox() {
  const g = $('#dateGregorian'), l = $('#dateLunar');
  if (!g || !l) return;
  const lu = lunar();
  const now = new Date();
  const dow = now.getDay();

  if (state.lang === 'en') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    g.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} (${days[dow]})`;
  } else {
    const days = ['日','一','二','三','四','五','六'];
    g.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 (${days[dow]})`;
  }

  const bits = [];
  if (lu.lunar) bits.push(`${t('lunarDate')} ${lu.lunar}`);
  if (lu.term) bits.push(`${t('solarTerm')} ${lu.term}`);
  l.innerHTML = bits.length
    ? esc(bits.join(' · ')).replace(esc(lu.term || '\u0000'), `<span class="datebox__term">${esc(lu.term)}</span>`)
    : '';
}

function renderWarningBar() {
  const bar = $('#warningBar');
  if (!bar) return;
  const list = warningList();
  if (!list.length) { bar.hidden = true; bar.innerHTML = ''; return; }
  const severe = list.some((w) => severityOf(w.code) === 'severe');
  bar.hidden = false;
  bar.className = `warnbar ${severe ? 'warnbar--severe' : ''}`;
  bar.innerHTML = list.map((w) =>
    `<span class="warnbar__pill"><span>${esc(w.code || '')}</span></span><strong>${esc(w.name || '')}</strong>`).join('');
}

function renderStatus() {
  const dot = $('#statusDot'), txt = $('#statusText'), btn = $('#refreshBtn');
  if (!dot || !txt) return;
  dot.className = 'dot ' + (state.error ? 'dot--err' : state.loading ? 'dot--idle' : state.stale ? 'dot--stale' : 'dot--live');

  if (state.loading && !state.fetchedAt) txt.textContent = t('loading');
  else if (state.error && !state.bundle) txt.textContent = `${t('err')} — ${state.error}`;
  else {
    const when = state.fetchedAt ? new Date(state.fetchedAt) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    txt.textContent = `${t(state.stale ? 'stale' : 'live')} ${p(when.getHours())}:${p(when.getMinutes())} (${relTime(state.fetchedAt)})`;
  }
  if (btn) { btn.disabled = state.loading; btn.textContent = state.loading ? t('refreshing') : t('refresh'); }

  const meta = $('#footMeta');
  if (meta && state.bundle) {
    const m = state.bundle.meta && state.bundle.meta.rhrread;
    const errs = (state.bundle.errors || []).map((e) => e.type).join(',');
    meta.textContent = `lang=${state.lang} · rhrread=${m && m.ok ? 'ok' : 'fail'} · fetchedAt=${m ? m.fetchedAt : '—'}`
      + (errs ? ` · failed=[${errs}]` : '') + (state.stale ? ' · STALE' : '');
  }
}

/* ------------------------------------------------------------------ *
 * secondary products
 *
 * The Observatory splits its open data across three services; the dated and
 * climatological products on opendata.php plus the earthquake service are loaded
 * once, on demand, and reused by every page that needs them.
 * ------------------------------------------------------------------ */

function ensureProducts() {
  if (state.products || state.productsInFlight) return;
  state.productsInFlight = fetch(`/api/products?lang=${state.lang}`)
    .then((r) => r.json())
    .then((d) => { state.products = d; state.productsInFlight = null; renderAll(); })
    .catch(() => { state.productsInFlight = null; });
}

/** Raw product payload, or null while it is still loading / unavailable. */
function prod(key) {
  return (state.products && state.products[key]) || null;
}
function prodFailed(key) {
  const m = state.products && state.products.meta && state.products.meta[key];
  return !!(m && !m.ok);
}
function prodError(key) {
  const m = state.products && state.products.meta && state.products.meta[key];
  return m ? m.error : null;
}

/** A loading/error card used when a product has not arrived or failed. */
function productShell(titleKey, key, bodyFn) {
  const raw = prod(key);
  if (!raw) {
    return `<section class="card">
      <h2 class="card__title">${esc(t(titleKey))}</h2>
      <div class="card__body">
        ${prodFailed(key)
          ? `<p class="empty">${esc(t('productUnavailable'))}: ${esc(prodError(key) || '')}</p>`
          : '<div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:40%"></div>'}
      </div>
    </section>`;
  }
  return bodyFn(raw);
}

/* ---- 雨量分佈圖 ---- */
function viewRainfall() {
  state.regional.dataset = 'rain';
  return viewRegional();
}

/* ---- 紫外線資訊 ---- */
function viewUv() {
  const uv = uvValue();
  const all = ((rhr().uvindex && rhr().uvindex.data) || []);
  const rows = all.map((d) => `<tr><td>${esc(d.place)}</td><td class="num">${esc(d.value)}</td><td>${esc(d.desc || '')}</td></tr>`).join('');
  const rec = (rhr().uvindex && rhr().uvindex.recordDesc) || '';
  return `<section class="card">
      <h2 class="card__title">${esc(t('uvTitle'))}</h2>
      <div class="card__body">
        <div class="hero">
          <div>
            <div class="hero__temp">${uv ? esc(uv.value) : '—'}</div>
            <div class="hero__desc">${esc(uv ? uv.desc : '')}</div>
          </div>
        </div>
        ${rec ? `<p class="prose prose--muted" style="margin-top:12px">${esc(rec)}</p>` : ''}
        <div class="tablewrap" style="margin-top:12px">
          <table class="tbl">
            <thead><tr><th>${esc(t('colStation'))}</th><th style="text-align:right">${esc(t('uvindex'))}</th><th>${esc(t('uvLevel'))}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>
        <p class="paramrow__hint">${esc(t('uvFeedNote'))}</p>
      </div>
    </section>`;
}

/* ---- 香港水域能見度 (LTMV) ---- */
function viewVisibility() {
  return productShell('visTitle', 'LTMV', (raw) => {
    const rows = (raw.data || []).map((r) => {
      const km = parseFloat(String(r[2]));
      return `<tr><td>${esc(r[1])}</td><td class="num">${esc(r[2])}</td>
        <td><span class="tempchip" style="background:${visColor(km)}">${Number.isFinite(km) ? esc(km) : '—'}</span></td></tr>`;
    }).join('');
    const at = (raw.data && raw.data[0] && raw.data[0][0]) || '';
    const tstr = at ? `${at.slice(0, 4)}-${at.slice(4, 6)}-${at.slice(6, 8)} ${at.slice(8, 10)}:${at.slice(10, 12)}` : '—';
    return `<section class="card">
      <h2 class="card__title">${esc(t('visTitle'))}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr><th>${esc(t('colStation'))}</th><th style="text-align:right">${esc(t('visibility'))}</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>
        <div class="chartlegend">
          <span>${esc(t('visLow'))} &lt; 5 km</span><span>${esc(t('visMid'))} 5–20 km</span><span>${esc(t('visHigh'))} &gt; 20 km</span>
        </div>
      </div>
      <p class="card__note">${esc(t('recordTime'))}: ${esc(tstr)} · ${esc(t('visSource'))}</p>
    </section>`;
  });
}

/** Green/amber/red for visibility in km. */
function visColor(km) {
  if (!Number.isFinite(km)) return 'var(--ink-4)';
  if (km < 5) return 'var(--red)';
  if (km < 20) return 'var(--amber)';
  return 'var(--green)';
}

/* ---- 天氣報告 ---- */
function viewReport() {
  const f = flw();
  const st = heroStation();
  const recTime = (rhr().temperature && rhr().temperature.recordTime) || rhr().updateTime;
  const icon = currentIcon();
  return `<section class="card">
      <h2 class="card__title">${esc(t('reportTitle'))}</h2>
      <div class="card__body">
        <div class="hero">
          ${icon ? `<img class="hero__icon" src="${esc(iconUrl(icon))}" alt="" width="108" height="108">` : ''}
          <div>
            <div class="hero__temp">${st && st.value != null ? esc(st.value) : '—'}<sup>${esc(t('unitC'))}</sup></div>
            <div class="hero__desc">${esc(st ? st.place : '—')}</div>
            <div class="hero__meta">${esc(t('recordTime'))}: ${esc(fmtTime(recTime))}</div>
          </div>
        </div>
        <p class="prose" style="margin-top:14px">${esc(f.generalSituation || t('pickerNoData'))}</p>
        <p class="prose prose--muted">${esc(f.forecastDesc || '')}</p>
      </div>
      ${f.updateTime ? `<p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(f.updateTime))}</p>` : ''}
    </section>
    ${viewAlerts()}`;
}

/* ---- 昨日天氣及輻射水平資料 (RYES) ---- */
const RYES_LABELS = {
  HKOReadingsMaxTemp: ['昨日最高氣溫', '昨日最高气温', 'Max temperature'],
  HKOReadingsMinTemp: ['昨日最低氣溫', '昨日最低气温', 'Min temperature'],
  HKOReadingsMaxRH: ['昨日最高相對濕度', '昨日最高相对湿度', 'Max humidity'],
  HKOReadingsMinRH: ['昨日最低相對濕度', '昨日最低相对湿度', 'Min humidity'],
  HKOReadingsMinGrassTemp: ['昨日最低草溫', '昨日最低草温', 'Min grass temperature'],
  HKOReadingsRainfall: ['昨日雨量', '昨日雨量', 'Rainfall'],
  HKOReadingsAccumRainfall: ['本年至今累積雨量', '本年至今累积雨量', 'Accumulated rainfall this year'],
  HKOReadingsAvgRainfall: ['同期平均雨量', '同期平均雨量', 'Average rainfall for the period'],
  HKOReadingsSunshine: ['昨日日照', '昨日日照', 'Sunshine duration'],
  HKOReadingsEvaporation: ['昨日蒸發量', '昨日蒸发量', 'Evaporation'],
  HKOReadingsSolarRadiation: ['昨日太陽輻射', '昨日太阳辐射', 'Solar radiation'],
  HKOReadingsMaxGrassTemp: ['昨日最高草溫', '昨日最高草温', 'Max grass temperature'],
  HKOReadingsMeanTemp: ['昨日平均氣溫', '昨日平均气温', 'Mean temperature'],
  HKOReadingsMeanRH: ['昨日平均相對濕度', '昨日平均相对湿度', 'Mean humidity'],
  HKOReadingsMeanPressure: ['昨日平均氣壓', '昨日平均气压', 'Mean pressure'],
};

function viewYesterday() {
  return productShell('yestTitle', 'RYES', (raw) => {
    const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);
    const rows = Object.entries(raw).map(([k, v]) => {
      const lab = RYES_LABELS[k];
      const name = lab ? lab[li] : k.replace(/^HKOReadings/, '').replace(/([A-Z])/g, ' $1').trim();
      return `<tr><td>${esc(name)}</td><td class="num">${esc(String(v))}</td></tr>`;
    }).join('');
    return `<section class="card">
      <h2 class="card__title">${esc(t('yestTitle'))}</h2>
      <div class="card__body">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr><th>${esc(t('colElement'))}</th><th style="text-align:right">${esc(t('colValue'))}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="2" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('yestStation'))} · ${esc(t('yestSource'))}</p>
    </section>`;
  });
}

/* ---- 過去天氣 (CLMTEMP / CLMMAXT / CLMMINT) ---- */
function climateTable(key, label) {
  return productShell(key, key, (raw) => {
    const data = raw.data || [];
    const mine = data.filter((r) => String(r[1]) === String(new Date().getMonth() + 1));
    const vals = mine.map((r) => parseFloat(r[3])).filter((v) => Number.isFinite(v));
    const mean = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const hi = vals.length ? Math.max(...vals) : null;
    const lo = vals.length ? Math.min(...vals) : null;
    const rows = mine.slice(0, 31).map((r) => `<tr><td>${esc(String(r[1]))}-${esc(String(r[2]))}</td>
      <td class="num">${esc(String(r[3]))}</td><td>${esc(String(r[4]) === 'C' ? '' : String(r[4]))}</td></tr>`).join('');
    const units = (raw.type && raw.type[1]) || '';
    return `<section class="card">
      <h2 class="card__title">${esc(label)}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('climMean'))}</div><div class="metric__v">${mean == null ? '—' : esc(mean.toFixed(1))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('climMax'))}</div><div class="metric__v">${hi == null ? '—' : esc(hi)}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('climMin'))}</div><div class="metric__v">${lo == null ? '—' : esc(lo)}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('climDays'))}</div><div class="metric__v">${vals.length}</div></div>
        </div>
        <div class="tablewrap" style="margin-top:12px;max-height:320px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('colDate'))}</th><th style="text-align:right">${esc(t('colValue'))}</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(units)}</p>
    </section>`;
  });
}

function viewClimate() {
  return `<section class="card">
      <h2 class="card__title">${esc(t('climateTitle'))}</h2>
      <div class="card__body"><p class="prose">${esc(t('climateIntro'))}</p></div>
    </section>`
    + climateTable('CLMTEMP', t('climTemp'))
    + climateTable('CLMMAXT', t('climMaxT'))
    + climateTable('CLMMINT', t('climMinT'));
}

/* ---- 京士柏氣象站 ---- */
function viewKp() {
  const uvRow = (((rhr().uvindex || {}).data) || [])[0] || null;
  const temp = tempStations().find((d) => /京士柏|King's Park/i.test(d.place)) || null;
  if (!state.wind) ensureWind();
  const wind = (state.wind && state.wind.stations || []).find((s) => s.id === 'HKP') || null;
  return `<section class="card">
      <h2 class="card__title">${esc(t('kpTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('temp'))}</div><div class="metric__v">${temp ? esc(temp.value) : '—'}<small>${esc(t('unitC'))}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('uvindex'))}</div><div class="metric__v">${uvRow ? esc(uvRow.value) : '—'}</div><div class="metric__sub">${esc(uvRow ? uvRow.desc : '')}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('windSpeed'))}</div><div class="metric__v">${wind ? esc(wind.speedKmh) : '—'}<small>km/h</small></div><div class="metric__sub">${esc(wind ? (wind.calm ? t('calm') : wind.dirName || '') : '')}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('gust'))}</div><div class="metric__v">${wind && wind.gustKmh != null ? esc(wind.gustKmh) : '—'}<small>km/h</small></div></div>
        </div>
      </div>
      <p class="card__note">${esc(t('kpNote'))}</p>
    </section>`;
}

/* ---- 熱帶氣旋警告 ---- */
function viewTc() {
  const msg = rhr().tcmessage || '';
  const warn = warningList().filter((w) => /TC|WT/.test(String(w.code || '')));
  return `<section class="card">
      <h2 class="card__title">${esc(t('tcTitle'))}</h2>
      <div class="card__body">
        ${msg ? `<p class="prose">${esc(msg)}</p>`
              : `<p class="empty">${esc(t('noTc'))}</p>`}
        ${warn.length ? warn.map((w) => `<div class="alert alert--severe"><p class="alert__h">${esc(w.name || w.code)}</p><p class="alert__b">${esc(w.contents || '')}</p></div>`).join('') : ''}
      </div>
      <p class="card__note">${esc(t('tcNote'))}</p>
    </section>`;
}

/* ---- 大雨及雷暴區域資訊 ---- */
function viewRainstorm() {
  const rain = rainStations().map((d) => ({ place: d.place, value: Number(d.max) || 0 }));
  const wet = rain.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const active = lightningActive();
  return `<section class="card">
      <h2 class="card__title">${esc(t('rainstormTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('districtsWithRain'))}</div><div class="metric__v">${wet.length}<small>/ ${rain.length}</small></div></div>
          <div class="metric"><div class="metric__k">${esc(t('maxRainfall'))}</div><div class="metric__v">${wet.length ? esc(wet[0].value.toFixed(1)) : '0'}<small>mm</small></div><div class="metric__sub">${esc(wet.length ? wet[0].place : '')}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('lightning'))}</div><div class="metric__v">${active ? '⚡' : '—'}</div></div>
        </div>
        <div class="tablewrap" style="margin-top:12px">
          <table class="tbl">
            <thead><tr><th>${esc(t('colDistrict'))}</th><th style="text-align:right">${esc(t('rainfall'))} (mm)</th></tr></thead>
            <tbody>${wet.length ? wet.map((r) => `<tr><td>${esc(r.place)}</td><td class="num">${esc(r.value.toFixed(1))}</td></tr>`).join('')
              : `<tr><td colspan="2" class="empty">${esc(t('noRain'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('rainstormNote'))}</p>
    </section>`;
}

/* ---- 閃電位置資訊服務 ---- */
function viewLightning() {
  const active = lightningActive();
  return `<section class="card">
      <h2 class="card__title">${esc(t('lightningTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('lightning'))}</div><div class="metric__v">${active ? '⚡' : '—'}</div>
            <div class="metric__sub">${esc(active ? t('lightningActive') : t('lightningNone'))}</div></div>
        </div>
        <div class="imagery" style="margin-top:14px">
          <div class="imgcard"><div class="imgcard__h">${esc(t('lightningImg'))}</div><img src="/imagery/lightning" alt="${esc(t('lightningImg'))}"></div>
        </div>
      </div>
      <p class="card__note">${esc(t('lightningNote'))} · 1 min cache</p>
    </section>`;
}

/* ---- 太陽及月亮 (SRS / MRS) ---- */
function astroTable(titleKey, key, riseKey, setKey) {
  return productShell(titleKey, key, (raw) => {
    const today = hkDateStr();
    const data = raw.data || [];
    const todays = data.find((r) => String(r[0]) === today) || data[0] || null;
    const rows = data.slice(0, 31).map((r) => {
      const on = String(r[0]) === today;
      return `<tr class="${on ? 'row--selected' : ''}"><td>${esc(String(r[0]))}</td>
        <td class="num">${esc(String(r[1] ?? '—'))}</td><td class="num">${esc(String(r[2] ?? '—'))}</td><td class="num">${esc(String(r[3] ?? '—'))}</td></tr>`;
    }).join('');
    return `<section class="card">
      <h2 class="card__title">${esc(t(titleKey))}</h2>
      <div class="card__body">
        ${todays ? `<div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t(riseKey))}</div><div class="metric__v">${esc(String(todays[1] ?? '—'))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('transit'))}</div><div class="metric__v">${esc(String(todays[2] ?? '—'))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t(setKey))}</div><div class="metric__v">${esc(String(todays[3] ?? '—'))}</div></div>
        </div>` : ''}
        <div class="tablewrap" style="margin-top:12px;max-height:300px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('colDate'))}</th><th style="text-align:right">${esc(t(riseKey))}</th><th style="text-align:right">${esc(t('transit'))}</th><th style="text-align:right">${esc(t(setKey))}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" class="empty">${esc(t('pickerNoData'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('astroNote'))}</p>
    </section>`;
  });
}

function viewAstronomy() {
  return astroTable('sunTitle', 'SRS', 'sunrise', 'sunset')
    + astroTable('moonTitle', 'MRS', 'moonrise', 'moonset');
}

/* ---- 潮汐 (HHOT) ---- */
function viewTides() {
  return productShell('tideTitle', 'HHOT', (raw) => {
    const data = raw.data || [];
    const today = new Date().getDate();
    const todays = data.find((r) => Number(r[1]) === today) || data[0] || null;
    const hours = todays ? todays.slice(2).map(Number).filter(Number.isFinite) : [];
    const hi = hours.length ? Math.max(...hours) : null;
    const lo = hours.length ? Math.min(...hours) : null;
    const hiAt = hi == null ? null : hours.indexOf(hi);
    const loAt = lo == null ? null : hours.indexOf(lo);
    const rows = data.slice(0, 31).map((r) => {
      const h = r.slice(2).map(Number);
      const valid = h.filter(Number.isFinite);
      const mx = valid.length ? Math.max(...valid) : null;
      const mn = valid.length ? Math.min(...valid) : null;
      return `<tr class="${Number(r[1]) === today ? 'row--selected' : ''}"><td>${esc(String(r[0]))}-${esc(String(r[1]))}</td>
        <td class="num">${mn == null ? '—' : esc(mn.toFixed(2))}</td><td class="num">${mx == null ? '—' : esc(mx.toFixed(2))}</td></tr>`;
    }).join('');
    // simple sparkline of the selected day
    const spark = hours.length
      ? (() => {
        const w = 720, hgt = 130, pad = 10;
        const lo2 = Math.min(...hours), hi2 = Math.max(...hours);
        const span = (hi2 - lo2) || 1;
        const pts = hours.map((v, i) => {
          const x = pad + (i * (w - 2 * pad)) / Math.max(1, hours.length - 1);
          const y = hgt - pad - ((v - lo2) / span) * (hgt - 2 * pad);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return `<svg viewBox="0 0 ${w} ${hgt}" style="width:100%;height:auto;display:block">
          <polyline points="${pts}" fill="none" stroke="#1b5397" stroke-width="2"/>
        </svg>`;
      })()
      : '';
    return `<section class="card">
      <h2 class="card__title">${esc(t('tideTitle'))}</h2>
      <div class="card__body">
        <div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('tideHigh'))}</div><div class="metric__v">${hi == null ? '—' : esc(hi.toFixed(2))}<small>m</small></div><div class="metric__sub">${hiAt == null ? '' : `${String(hiAt).padStart(2, '0')}:00`}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('tideLow'))}</div><div class="metric__v">${lo == null ? '—' : esc(lo.toFixed(2))}<small>m</small></div><div class="metric__sub">${loAt == null ? '' : `${String(loAt).padStart(2, '0')}:00`}</div></div>
        </div>
        <div class="chartbox" style="margin-top:10px">${spark}</div>
        <div class="tablewrap" style="max-height:280px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('colDate'))}</th><th style="text-align:right">${esc(t('tideLow'))}</th><th style="text-align:right">${esc(t('tideHigh'))}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('tideNote'))}</p>
    </section>`;
  });
}

/* ---- 地震 (qem) ---- */
function viewEarthquake() {
  return productShell('eqTitle', 'qem', (raw) => {
    return `<section class="card">
      <h2 class="card__title">${esc(t('eqTitle'))}</h2>
      <div class="card__body">
        <div class="verdict verdict--${Number(raw.mag) >= 6 ? 'nogo' : (Number(raw.mag) >= 5 ? 'caution' : 'go')}">
          <div class="verdict__badge">M ${esc(String(raw.mag))}</div>
          <div class="verdict__text">${esc(raw.region || '')}<br>
            <span style="font-size:13px">${esc(raw.ptime || '')} · ${esc(String(raw.lat))}, ${esc(String(raw.lon))}</span></div>
        </div>
        <p class="paramrow__hint" style="margin-top:12px">${esc(t('eqNote'))}</p>
      </div>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(raw.updateTime))}</p>
    </section>`;
  });
}

/* ---- product without an open-data source ---- */
function viewProduct() {
  const key = state.productKey;
  const info = key && PRODUCT_INFO[key];
  const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);
  if (!info) {
    return `<section class="card">
      <h2 class="card__title">${esc(t('unknownProduct'))}</h2>
      <div class="card__body"><p class="empty">${esc(t('unknownProductBody'))}</p>
        <p><a href="#/home">${esc(t('backHome'))}</a></p></div>
    </section>`;
  }
  return `<section class="card">
      <h2 class="card__title">${esc(info.n[li])}</h2>
      <div class="card__body">
        <p class="prose">${esc(info.why[li])}</p>
        <p class="prose prose--muted">${esc(t('productPolicy'))}</p>
        <p><a href="#/overview">${esc(t('seeOverview'))}</a> · <a href="#/imagery">${esc(t('seeImagery'))}</a></p>
      </div>
      <p class="card__note">${esc(t('productNote'))}</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * archive-backed views
 *
 * The service records every observation, analysis run and LAE verdict into
 * SQLite. These pages are the reason that history exists: the JSON endpoints were
 * there, but nothing in the UI showed what had been recorded.
 * ------------------------------------------------------------------ */

function ensureArchiveStations() {
  if (state.archive.stations || state.archive.stationsInFlight) return;
  state.archive.stationsInFlight = fetch('/api/history?kind=stations')
    .then((r) => r.json())
    .then((d) => { state.archive.stations = d; state.archive.stationsInFlight = false; renderAll(); })
    .catch(() => { state.archive.stationsInFlight = false; });
}

/**
 * Fetch one series. Keyed by kind+station so switching back to a series already
 * loaded is instant, and so two views cannot fight over one slot.
 */
function ensureSeries(kind, station) {
  const key = `${kind}:${station || ''}`;
  if (state.archive.seriesKey === key && state.archive.series) return;
  if (state.archive.pending === key) return;
  state.archive.pending = key;
  const qs = new URLSearchParams({ kind, limit: '500' });
  if (station) qs.set('station', station);
  fetch(`/api/history?${qs.toString()}`)
    .then((r) => r.json())
    .then((d) => {
      if (state.archive.pending !== key) return;   // a newer request superseded this one
      state.archive.series = d;
      state.archive.seriesKey = key;
      state.archive.pending = null;
      renderAll();
    })
    .catch(() => { state.archive.pending = null; });
}

function ensureLog(kind) {
  if (state.archive[kind] || state.archive[`${kind}Pending`]) return;
  state.archive[`${kind}Pending`] = true;
  fetch(`/api/history?kind=${kind}&limit=200`)
    .then((r) => r.json())
    .then((d) => { state.archive[kind] = d; state.archive[`${kind}Pending`] = false; renderAll(); })
    .catch(() => { state.archive[`${kind}Pending`] = false; });
}

/** Inline SVG line chart from a numeric series. No library, no canvas sizing. */
function sparkline(values, opts = {}) {
  const vals = values.filter((v) => Number.isFinite(v));
  if (vals.length < 2) return '';
  const w = 900, h = opts.height || 160, pad = 14;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = (hi - lo) || 1;
  const x = (i) => pad + (i * (w - 2 * pad)) / (vals.length - 1);
  const y = (v) => h - pad - ((v - lo) / span) * (h - 2 * pad);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pad},${h - pad} ${pts} ${(w - pad).toFixed(1)},${h - pad}`;
  const color = opts.color || '#1b5397';
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block" role="img">
    <polygon points="${area}" fill="${color}" opacity="0.12"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <text x="${pad}" y="12" font-size="11" fill="#666">${esc(String(hi))}</text>
    <text x="${pad}" y="${h - 3}" font-size="11" fill="#666">${esc(String(lo))}</text>
  </svg>`;
}

const SERIES_METRICS = [
  { k: 'temperature_c', n: ['氣溫', '气温', 'Temperature'], unit: '°C', color: '#c0392b' },
  { k: 'humidity_pct', n: ['相對濕度', '相对湿度', 'Humidity'], unit: '%', color: '#1b5397' },
  { k: 'rainfall_mm', n: ['雨量', '雨量', 'Rainfall'], unit: 'mm', color: '#1f8a4c' },
  { k: 'speed_kmh', n: ['風速', '风速', 'Wind speed'], unit: 'km/h', color: '#3f777d' },
  { k: 'gust_kmh', n: ['陣風', '阵风', 'Gust'], unit: 'km/h', color: '#e0a415' },
];

/* ---- 觀測歷史 ---- */
function viewHistory() {
  const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);
  ensureArchiveStations();

  const bag = state.archive.series;
  const windMode = state.archive.kind === 'wind';
  const stationList = ((state.archive.stations && (windMode ? state.archive.stations.wind : state.archive.stations.observation)) || []);
  if (!state.archive.station && stationList.length) state.archive.station = stationList[0].id;

  const metrics = windMode
    ? SERIES_METRICS.filter((m) => m.k === 'speed_kmh' || m.k === 'gust_kmh')
    : SERIES_METRICS.filter((m) => m.k === 'temperature_c' || m.k === 'humidity_pct' || m.k === 'rainfall_mm');
  if (!metrics.some((m) => m.k === state.archive.metric)) state.archive.metric = metrics[0].k;

  if (state.archive.station) ensureSeries(windMode ? 'wind' : 'observation', state.archive.station);

  const items = (bag && bag.items) || [];
  const metric = metrics.find((m) => m.k === state.archive.metric) || metrics[0];
  const vals = items.map((r) => Number(r[metric.k])).filter((v) => Number.isFinite(v));
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  const rows = items.slice().reverse().slice(0, 400).map((r) => {
    const v = Number(r[metric.k]);
    return `<tr><td>${esc(fmtTime(r.observed_at))}</td>
      <td class="num">${Number.isFinite(v) ? esc(v.toFixed(metric.unit === 'mm' ? 1 : 0)) : '—'}${metric.unit ? ' ' + esc(metric.unit) : ''}</td></tr>`;
  }).join('');

  const stationOpts = stationList.map((s) => `<option value="${esc(s.id)}" ${s.id === state.archive.station ? 'selected' : ''}>${esc(s.name)} (${s.n})</option>`).join('');

  return `<section class="card">
      <h2 class="card__title">${esc(t('histTitle'))}</h2>
      <div class="card__body">
        <p class="prose prose--muted">${esc(t('histIntro'))}</p>
        <div class="paramrow" style="margin-top:12px">
          <span class="paramrow__lab">${esc(t('histSource'))}</span>
          <select data-arch-source aria-label="${esc(t('histSource'))}">
            <option value="observation" ${!windMode ? 'selected' : ''}>${esc(t('histObs'))}</option>
            <option value="wind" ${windMode ? 'selected' : ''}>${esc(t('histWind'))}</option>
          </select>
          <span class="paramrow__lab">${esc(t('pickerStation'))}</span>
          <select data-arch-station aria-label="${esc(t('pickerStation'))}">${stationOpts || `<option>—</option>`}</select>
          <span class="paramrow__lab">${esc(t('histMetric'))}</span>
          <select data-arch-metric aria-label="${esc(t('histMetric'))}">
            ${metrics.map((m) => `<option value="${esc(m.k)}" ${m.k === metric.k ? 'selected' : ''}>${esc(m.n[li])}</option>`).join('')}
          </select>
        </div>
      </div>
      ${items.length ? `<div class="card__body" style="padding-top:0">${sparkline(items.map((r) => Number(r[metric.k])), { color: metric.color })}</div>` : ''}
      ${vals.length ? `<div class="card__body" style="padding-top:0"><div class="metrics">
          <div class="metric"><div class="metric__k">${esc(t('histPoints'))}</div><div class="metric__v">${vals.length}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('pickerMax'))}</div><div class="metric__v">${esc(Math.max(...vals).toFixed(1))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('pickerMin'))}</div><div class="metric__v">${esc(Math.min(...vals).toFixed(1))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('pickerMean'))}</div><div class="metric__v">${mean == null ? '—' : esc(mean.toFixed(1))}</div></div>
        </div></div>` : ''}
      <div class="card__body" style="padding-top:0">
        ${rows ? `<div class="tablewrap" style="max-height:300px;overflow-y:auto"><table class="tbl">
            <thead><tr><th>${esc(t('histWhen'))}</th><th style="text-align:right">${esc(metric.n[li])}</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`
          : `<p class="empty">${esc(t('histEmpty'))}</p>`}
      </div>
      <p class="card__note">${esc(t('histNote'))}</p>
    </section>`;
}

/* ---- 評估記錄 ---- */
function viewVerdicts() {
  ensureLog('lae');
  const d = state.archive.lae;
  const items = (d && d.items) || [];
  const counts = items.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  const rows = items.map((r) => {
    const cls = r.verdict === 'NO-GO' ? 'row--nogo' : (r.verdict === 'CAUTION' ? 'row--caution' : '');
    const bl = (r.blockers || []).length;
    const ca = (r.cautions || []).length;
    return `<tr class="${cls}">
      <td>${esc(fmtTime(r.generated_at))}</td>
      <td class="num">${esc(r.altitude_m)} m</td>
      <td><span class="pill pill--${r.verdict === 'NO-GO' ? 'nogo' : (r.verdict === 'CAUTION' ? 'caution' : 'go')}">${esc(r.verdict)}</span></td>
      <td>${esc(r.summary || '')}</td>
      <td class="num">${bl}</td><td class="num">${ca}</td>
    </tr>`;
  }).join('');

  return `<section class="card">
      <h2 class="card__title">${esc(t('verdictTitle'))}</h2>
      <div class="card__body">
        <p class="prose prose--muted">${esc(t('verdictIntro'))}</p>
        ${items.length ? `<div class="metrics" style="margin-top:12px">
          <div class="metric"><div class="metric__k">${esc(t('verdictTotal'))}</div><div class="metric__v">${items.length}</div></div>
          <div class="metric"><div class="metric__k">NO-GO</div><div class="metric__v">${counts['NO-GO'] || 0}</div></div>
          <div class="metric"><div class="metric__k">CAUTION</div><div class="metric__v">${counts.CAUTION || 0}</div></div>
          <div class="metric"><div class="metric__k">GO</div><div class="metric__v">${counts.GO || 0}</div></div>
        </div>` : ''}
        <div class="tablewrap" style="margin-top:12px;max-height:420px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('histWhen'))}</th><th style="text-align:right">${esc(t('laeAlt'))}</th>
              <th>${esc(t('verdictCol'))}</th><th>${esc(t('verdictWhy'))}</th>
              <th style="text-align:right">${esc(t('verdictBlockers'))}</th><th style="text-align:right">${esc(t('verdictCautions'))}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6" class="empty">${esc(t('verdictEmpty'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('verdictNote'))}</p>
    </section>`;
}

/* ---- 分析記錄 ---- */
function viewRuns() {
  ensureLog('analysis');
  const d = state.archive.analysis;
  const items = (d && d.items) || [];
  const sel = items.reduce((a, r) => { a[r.selected_estimator] = (a[r.selected_estimator] || 0) + 1; return a; }, {});
  const drift = Object.keys(sel).length;
  const rmses = items.map((r) => Number(r.rmse)).filter(Number.isFinite);

  const rows = items.map((r) => `<tr>
      <td>${esc(fmtTime(r.generated_at))}</td>
      <td>${esc(r.selected_estimator)}</td>
      <td class="num">${r.rmse == null ? '—' : esc(Number(r.rmse).toFixed(3))}</td>
      <td class="num">${esc(r.correction_helped ? t('runsYes') : t('runsNo'))}</td>
      <td class="num">${esc(r.stations)}</td>
      <td class="num">${r.field_min == null ? '—' : esc(r.field_min)}–${r.field_max == null ? '—' : esc(r.field_max)}</td>
      <td>${esc(r.grid_cols)}×${esc(r.grid_rows)}</td>
    </tr>`).join('');

  return `<section class="card">
      <h2 class="card__title">${esc(t('runsTitle'))}</h2>
      <div class="card__body">
        <p class="prose prose--muted">${esc(t('runsIntro'))}</p>
        ${items.length ? `<div class="metrics" style="margin-top:12px">
          <div class="metric"><div class="metric__k">${esc(t('runsTotal'))}</div><div class="metric__v">${items.length}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('runsEstimators'))}</div><div class="metric__v">${drift}</div>
            <div class="metric__sub">${esc(Object.entries(sel).map(([k, v]) => `${k}×${v}`).join(' · '))}</div></div>
          <div class="metric"><div class="metric__k">${esc(t('runsRmse'))}</div>
            <div class="metric__v">${rmses.length ? esc(Math.min(...rmses).toFixed(2)) : '—'}<small>–${rmses.length ? esc(Math.max(...rmses).toFixed(2)) : '—'}</small></div></div>
        </div>` : ''}
        ${drift > 1 ? `<p class="paramrow__hint">${esc(t('runsDrift'))}</p>` : ''}
        <div class="tablewrap" style="margin-top:12px;max-height:420px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('histWhen'))}</th><th>${esc(t('runsEstimator'))}</th>
              <th style="text-align:right">RMSE (K)</th><th style="text-align:right">${esc(t('runsCorrection'))}</th>
              <th style="text-align:right">${esc(t('runsStations'))}</th><th style="text-align:right">${esc(t('runsField'))}</th>
              <th>${esc(t('runsGrid'))}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="7" class="empty">${esc(t('runsEmpty'))}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('runsNote'))}</p>
    </section>`;
}

/* ---- 警告類型參考 ---- */
/* The 16 warning codes the API's warnsum uses, with what each means. The market
 * column reflects the ordinary Hong Kong practice of suspending trading under
 * Signal 8+ or the black rainstorm warning. It is stated as general practice, not
 * as advice — the exchange decides, not this software. */
const WARNING_TYPES = [
  { code: 'WTCSGNL', n: ['熱帶氣旋警告信號', '热带气旋警告信号', 'Tropical Cyclone Warning Signal'], d: ['T1/T3 強風，T8 烈風，T9/T10 颶風', 'T1/T3 强风，T8 烈风，T9/T10 飓风', 'T1/T3 strong wind, T8 gale, T9/T10 hurricane'], halt: true },
  { code: 'WRAINR', n: ['黑色暴雨警告信號', '黑色暴雨警告信号', 'Black Rainstorm Warning'], d: ['廣泛地區雨量超過 70 毫米', '广泛地区雨量超过 70 毫米', 'Over 70 mm of rain widely'], halt: true },
  { code: 'WRAINB', n: ['紅色暴雨警告信號', '红色暴雨警告信号', 'Red Rainstorm Warning'], d: ['雨量超過 50 毫米', '雨量超过 50 毫米', 'Over 50 mm of rain'], halt: false },
  { code: 'WRAINA', n: ['黃色暴雨警告信號', '黄色暴雨警告信号', 'Amber Rainstorm Warning'], d: ['雨量超過 30 毫米', '雨量超过 30 毫米', 'Over 30 mm of rain'], halt: false },
  { code: 'WRAIN', n: ['暴雨警告信號（總類）', '暴雨警告信号（总类）', 'Rainstorm Warning Signal'], d: ['暴雨警告的母類別', '暴雨警告的母类别', 'Parent category for rainstorm signals'], halt: false },
  { code: 'WTS', n: ['雷暴警告', '雷暴警告', 'Thunderstorm Warning'], d: ['香港境內有雷暴', '香港境内有雷暴', 'Thunderstorms within Hong Kong'], halt: false },
  { code: 'WMSGNL', n: ['強烈季候風信號', '强烈季候风信号', 'Strong Monsoon Signal'], d: ['季候風風力達強風程度', '季候风风力达强风程度', 'Monsoon winds reaching strong force'], halt: false },
  { code: 'WLP', n: ['山泥傾瀉警告', '山泥倾泻警告', 'Landslip Warning'], d: ['持續大雨後山泥傾瀉風險', '持续大雨后山泥倾泻风险', 'Landslip risk after prolonged rain'], halt: false },
  { code: 'WFNTSA', n: ['新界北水浸特別報告', '新界北水浸特别报告', 'Flooding in N. New Territories'], d: ['新界北部水浸', '新界北部水浸', 'Flooding in northern New Territories'], halt: false },
  { code: 'WHOT', n: ['酷熱天氣警告', '酷热天气警告', 'Very Hot Weather Warning'], d: ['氣溫達 33 度或以上', '气温达 33 度或以上', 'Temperature reaching 33 °C or above'], halt: false },
  { code: 'WCOLD', n: ['寒冷天氣警告', '寒冷天气警告', 'Cold Weather Warning'], d: ['氣溫顯著下降', '气温显著下降', 'A marked drop in temperature'], halt: false },
  { code: 'WFROST', n: ['霜凍警告', '霜冻警告', 'Frost Warning'], d: ['高地或新界北部可能結霜', '高地或新界北部可能结霜', 'Frost likely on high ground or in the north'], halt: false },
  { code: 'WFIRE', n: ['火災危險警告（總類）', '火灾危险警告（总类）', 'Fire Danger Warning'], d: ['火災危險的母類別', '火灾危险的母类别', 'Parent category for fire danger'], halt: false },
  { code: 'WFIRER', n: ['紅色火災危險警告', '红色火灾危险警告', 'Red Fire Danger Warning'], d: ['火災危險性極高', '火灾危险性极高', 'Extremely high fire risk'], halt: false },
  { code: 'WFIREY', n: ['黃色火災危險警告', '黄色火灾危险警告', 'Yellow Fire Danger Warning'], d: ['火災危險性高', '火灾危险性高', 'High fire risk'], halt: false },
  { code: 'WTMW', n: ['海嘯警告', '海啸警告', 'Tsunami Warning'], d: ['海嘯可能影響香港', '海啸可能影响香港', 'A tsunami may affect Hong Kong'], halt: true },
];

function viewWarningRef() {
  const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);
  const rows = WARNING_TYPES.map((w) => {
    // whether this code is in force right now, from the live warning summary
    const live = warningList().some((x) => String(x.code || '').toUpperCase() === w.code);
    return `<tr class="${live ? 'row--selected' : ''}">
      <td><code>${esc(w.code)}</code></td>
      <td>${esc(w.n[li])}${live ? ` <span class="pill pill--nogo">${esc(t('warnInForce'))}</span>` : ''}</td>
      <td>${esc(w.d[li])}</td>
      <td>${w.halt ? `<span class="pill pill--caution">${esc(t('warnHalt'))}</span>` : '—'}</td>
    </tr>`;
  }).join('');

  return `<section class="card">
      <h2 class="card__title">${esc(t('warnRefTitle'))}</h2>
      <div class="card__body">
        <p class="prose prose--muted">${esc(t('warnRefIntro'))}</p>
        <div class="tablewrap" style="margin-top:12px;max-height:520px;overflow-y:auto">
          <table class="tbl">
            <thead><tr><th>${esc(t('warnCode'))}</th><th>${esc(t('warnName'))}</th>
              <th>${esc(t('warnMeaning'))}</th><th>${esc(t('warnMarket'))}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <p class="card__note">${esc(t('warnRefNote'))}</p>
    </section>
    ${viewAlerts()}`;
}

/* ------------------------------------------------------------------ *
 * sidebar navigation
 *
 * HKO's homepage is a left navigation tree, not a horizontal tab bar. The
 * grouping and labels below mirror that information architecture.
 *
 * Every entry resolves to a route inside this SPA — nothing navigates away.
 * Where a product has no open-data source the entry still points at a local
 * page (see PRODUCT_INFO) rather than the Observatory's own site.
 * ------------------------------------------------------------------ */

/* Products the Observatory publishes that are NOT in its open-data API. Each
 * gets its own local route so nothing navigates away from localhost, and each
 * states plainly what is missing rather than rendering an empty shell. */
const PRODUCT_INFO = {
  photos: { n: ['天氣照片', '天气照片', 'Weather photos'], why: ['公開數據不提供照片影像', '开放数据不提供照片影像', 'The open data API does not serve photo imagery'] },
  upperair: { n: ['香港高空氣象觀測', '香港高空气象观测', 'Upper-air observations'], why: ['探空及雷達風資料不經開放數據發布', '探空及雷达风资料不经开放数据发布', 'Radiosonde and wind-profiler data are not published through open data'] },
  extended: { n: ['延伸預報', '延伸预报', 'Extended forecast'], why: ['概率預報不經開放數據發布', '概率预报不经开放数据发布', 'Probabilistic forecast products are not published through open data'] },
  ocf: { n: ['自動分區天氣預報', '自动分区天气预报', 'Automatic regional forecast'], why: ['地圖產品不提供機器可讀介面', '地图产品不提供机器可读接口', 'The map products expose no machine-readable API'] },
  ncrf: { n: ['兩小時降雨預報', '两小时降雨预报', '2-hour rainfall nowcast'], why: ['臨近預報圖像不經開放數據發布', '临近预报图像不经开放数据发布', 'Nowcast imagery is not published through open data'] },
  uvfcst: { n: ['紫外線指數預測', '紫外线指数预测', 'UV index forecast'], why: ['僅實測紫外線指數在開放數據內', '仅实测紫外线指数在开放数据内', 'Only the observed UV index is in open data, not the forecast'] },
  scs: { n: ['華南海域天氣報告', '南海海域天气报告', 'South China Sea forecast'], why: ['海洋預報不經開放數據發布', '海洋预报不经开放数据发布', 'Marine forecasts are not published through open data'] },
  marine: { n: ['船舶天氣預報', '船舶天气预报', 'Marine forecast'], why: ['同上：海洋產品不經開放數據發布', '同上：海洋产品不经开放数据发布', 'As above: marine products are not in the open data feed'] },
  mariners: { n: ['航運界天氣資料', '航运界天气资料', 'Mariners weather'], why: ['航海專用產品不經開放數據發布', '航海专用产品不经开放数据发布', 'Mariner-specific products are not published through open data'] },
  portmet: { n: ['香港海港氣象服務', '香港海港气象服务', 'HK port meteorological service'], why: ['港口服務為獨立系統', '港口服务为独立系统', 'The port service is a separate system'] },
  seagallery: { n: ['我的海洋天氣圖像廊', '我的海洋天气图像廊', 'Marine weather gallery'], why: ['圖像廊不提供機器可讀介面', '图像廊不提供机器可读接口', 'The gallery exposes no machine-readable API'] },
  wxchart: { n: ['天氣圖', '天气图', 'Weather chart'], why: ['分析天氣圖不經開放數據發布', '分析天气图不经开放数据发布', 'Analysed synoptic charts are not published through open data'] },
  sanddust: { n: ['沙塵天氣資訊', '沙尘天气信息', 'Sandstorm information'], why: ['按事件發布，非固定時序', '按事件发布，非固定时序', 'Published per event rather than as a feed'] },
  trajectory: { n: ['反軌跡路線圖', '反轨迹路线图', 'Backward trajectory'], why: ['模式輸出不在開放數據內', '模式输出不在开放数据内', 'Model output is not in the open data feed'] },
  earthwx: { n: ['地球天氣', '地球天气', 'Earth weather'], why: ['三維可視化為獨立應用', '三维可视化为独立应用', 'The 3D viewer is a separate application'] },
  radiation: { n: ['輻射監測', '辐射监测', 'Radiation monitoring'], why: ['環境輻射數據另有來源', '环境辐射数据另有来源', 'Ambient radiation data has a separate source'] },
  community: { n: ['社群', '社群', 'Community'], why: ['非氣象資料', '非气象数据', 'Not meteorological data'] },
  learning: { n: ['學習', '学习', 'Learning'], why: ['非氣象資料', '非气象数据', 'Not meteorological data'] },
  about: { n: ['關於我們', '关于我们', 'About Us'], why: ['機構資料', '机构资料', 'Institutional information'] },
  opendataintro: { n: ['公開資料', '公开资料', 'Open Data'], why: ['本站已直接使用開放數據', '本站已直接使用开放数据', 'This site already consumes the open data directly'] },
  related: { n: ['相關網址', '相关网址', 'Related Sites'], why: ['外部連結', '外部链接', 'External links'] },
  userguide: { n: ['快速用戶指南', '快速用户指南', 'User Guide'], why: ['使用說明', '使用说明', 'Usage documentation'] },
  contact: { n: ['聯絡我們', '联络我们', 'Contact Us'], why: ['聯絡資料', '联络资料', 'Contact details'] },
  notice: { n: ['重要告示', '重要告示', 'Important Notices'], why: ['法律告示', '法律告示', 'Legal notices'] },
  privacy: { n: ['私隱政策', '私隐政策', 'Privacy Policy'], why: ['法律告示', '法律告示', 'Legal notices'] },
  climateSummary: { n: ['每月天氣摘要', '每月天气摘要', 'Monthly Summary'], why: ['摘要文章不在開放數據內', '摘要文章不在开放数据内', 'Summary articles are not in the open data set'] },
  news: { n: ['消息及文章', '消息及文章', 'News and articles'], why: ['文章內容屬天文台版權，本站只顯示標題', '文章内容属天文台版权，本站只显示标题', 'Article bodies are the Observatory\'s copyright; this site shows headlines only'] },
};

// [ 繁, 简, EN, destination ]  '#/x' = local view, '#/product/x' = local product page
const SIDEBAR_TREE = [
  ['天氣', '天气', 'Weather', [
    ['本港天氣', '本港天气', 'Local weather', [
      ['分區天氣', '分区天气', 'Regional weather', '#/regional'],
      ['天氣照片', '天气照片', 'Weather photos', '#/product/photos'],
      ['雨量分佈圖', '雨量分布图', 'Rainfall map', '#/rainfall'],
      ['紫外線資訊', '紫外线信息', 'UV information', '#/uv'],
      ['香港水域能見度', '香港水域能见度', 'Visibility in HK waters', '#/visibility'],
      ['天氣報告', '天气报告', 'Weather report', '#/report'],
      ['昨日天氣及輻射水平資料', '昨日天气及辐射水平资料', "Yesterday's weather", '#/yesterday'],
      ['過去天氣', '过去天气', 'Past weather', '#/climate'],
      ['香港高空氣象觀測', '香港高空气象观测', 'Upper-air observations', '#/product/upperair'],
      ['京士柏氣象站', '京士柏气象站', "King's Park station", '#/kp'],
    ]],
    ['天氣預測', '天气预测', 'Weather forecast', [
      ['本港地區天氣預報', '本港地区天气预报', 'Local weather forecast', '#/forecast'],
      ['九天天氣預報', '九天天气预报', '9-day forecast', '#/forecast'],
      ['特別天氣提示', '特别天气提示', 'Special weather tips', '#/alerts'],
      ['延伸預報', '延伸预报', 'Extended forecast', '#/product/extended'],
      ['自動分區天氣預報', '自动分区天气预报', 'Automatic regional forecast', '#/product/ocf'],
      ['兩小時降雨預報', '两小时降雨预报', '2-hour rainfall nowcast', '#/product/ncrf'],
      ['一小時閃電預報', '一小时闪电预报', '1-hour lightning nowcast', '#/lightning'],
      ['紫外線指數預測', '紫外线指数预测', 'UV index forecast', '#/product/uvfcst'],
      ['華南海域天氣報告', '南海海域天气报告', 'South China Sea forecast', '#/product/scs'],
      ['船舶天氣預報', '船舶天气预报', 'Marine forecast', '#/product/marine'],
    ]],
    ['天氣警告', '天气警告', 'Warnings', [
      ['今日天氣警告', '今日天气警告', "Today's warnings", '#/alerts'],
      ['詳細警告資料', '详细警告资料', 'Warning details', '#/alerts'],
      ['大雨及雷暴區域資訊', '大雨及雷暴区域信息', 'Rainstorm and thunderstorm areas', '#/rainstorm'],
      ['熱帶氣旋警告（本港地區）', '热带气旋警告（本港地区）', 'Tropical cyclone warning', '#/tc'],
      ['各類警告詳細資料', '各类警告详细资料', 'All warning bulletins', '#/warningref'],
      ['漁民天氣', '渔民天气', 'Fishermen weather', '#/product/marine'],
    ]],
    ['航運天氣', '航运天气', 'Marine weather', [
      ['航運界天氣資料', '航运界天气资料', 'Mariners weather', '#/product/mariners'],
      ['香港海港氣象服務', '香港海港气象服务', 'HK port met service', '#/product/portmet'],
      ['我的海洋天氣圖像廊', '我的海洋天气图像廊', 'Marine weather gallery', '#/product/seagallery'],
      ['航空天氣', '航空天气', 'Aviation weather', '#/lae'],
    ]],
    ['天氣監測圖像', '天气监测图像', 'Monitoring imagery', [
      ['雷達圖像', '雷达图像', 'Radar imagery', '#/imagery'],
      ['閃電位置資訊服務', '闪电位置信息服务', 'Lightning location service', '#/lightning'],
      ['氣象衛星圖片', '气象卫星图片', 'Satellite imagery', '#/imagery'],
      ['天氣圖', '天气图', 'Weather chart', '#/product/wxchart'],
      ['沙塵天氣資訊', '沙尘天气信息', 'Sandstorm information', '#/product/sanddust'],
      ['反軌跡路線圖', '反轨迹路线图', 'Backward trajectory', '#/product/trajectory'],
    ]],
    ['地理信息系統天氣服務', '地理信息系统天气服务', 'GIS weather services', [
      ['地球天氣', '地球天气', 'Earth weather', '#/product/earthwx'],
    ]],
  ]],
  ['天文、潮汐及地球物理', '天文、潮汐及地球物理', 'Astronomy, tides & geophysics', [
    ['太陽及月亮', '太阳及月亮', 'Sun and moon', '#/astronomy'],
    ['潮汐', '潮汐', 'Tides', '#/tides'],
    ['地震', '地震', 'Earthquakes', '#/earthquake'],
  ]],
  ['本站分析', '本站分析', 'Local analysis', [
    ['天氣總覽', '天气总览', 'Overview', '#/overview'],
    ['高解析度分析', '高分辨率分析', 'High-resolution analysis', '#/analysis'],
    ['觀測歷史', '观测历史', 'Observation history', '#/history'],
    ['作業評估記錄', '作业评估记录', 'LAE assessment log', '#/verdicts'],
    ['分析執行記錄', '分析执行记录', 'Analysis run log', '#/runs'],
    ['最新消息', '最新消息', 'News', '#/news'],
  ]],
];


/** Collapsed group paths, persisted so a reload keeps the tree as the user left it. */
const collapsedGroups = new Set(
  (() => { try { return JSON.parse(localStorage.getItem('hko.collapsed') || '[]'); } catch { return []; } })()
);

function saveCollapsed() {
  try { localStorage.setItem('hko.collapsed', JSON.stringify([...collapsedGroups])); } catch { /* private mode */ }
}

function renderSidebar() {
  const host = $('#sideNav');
  if (!host) return;
  const li = state.lang === 'en' ? 2 : (state.lang === 'sc' ? 1 : 0);

  const item = (n, path) => `<li><a class="side__link" href="${esc(n[3])}" data-path="${esc(path)}">${esc(n[li])}</a></li>`;

  const group = (n, depth, parentPath) => {
    const path = parentPath ? `${parentPath}/${n[li]}` : n[li];
    const kids = n[3] || [];
    const open = !collapsedGroups.has(path);
    const level = depth === 0 ? 'side__head--top' : 'side__head--sub';
    return `<li class="side__group">
      <button type="button" class="side__head ${level}" data-group="${esc(path)}" aria-expanded="${open}">
        <span class="side__caret" aria-hidden="true"></span>${esc(n[li])}
      </button>
      <ul class="side__list" ${open ? '' : 'hidden'}>
        ${kids.map((c) => (c[3] && Array.isArray(c[3]) ? group(c, depth + 1, path) : item(c, path))).join('')}
      </ul>
    </li>`;
  };

  host.innerHTML = `<nav class="side__inner" aria-label="${esc(t('sideNavLabel'))}">
    <ul class="side__list side__list--root">
      ${SIDEBAR_TREE.map((g) => group(g, 0, '')).join('')}
    </ul>
  </nav>`;

  $$('.side__head', host).forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.group;
      const list = btn.nextElementSibling;
      const nowOpen = list.hasAttribute('hidden');
      if (nowOpen) list.removeAttribute('hidden'); else list.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(nowOpen));
      if (nowOpen) collapsedGroups.delete(key); else collapsedGroups.add(key);
      saveCollapsed();
    });
  });

  markSidebarActive();
}

/** Highlight the sidebar entry that matches the current route. */
function markSidebarActive() {
  const want = `#/${state.route}`;
  $$('.side__link').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === want));
}

function renderI18nChrome() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : (state.lang === 'sc' ? 'zh-Hans-HK' : 'zh-Hant-HK');
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  $$('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  $$('.lang').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === state.lang));
  markSidebarActive();
}

/* ------------------------------------------------------------------ *
 * router / render
 * ------------------------------------------------------------------ */

function parseHash() {
  const m = String(location.hash || '').match(/^#\/([a-z]+)(?:\/([a-z0-9]+))?/i);
  const r = m ? m[1].toLowerCase() : 'home';
  // '#/product/<key>' carries the product to explain; every other route ignores it
  state.productKey = (r === 'product' && m && m[2]) ? m[2].toLowerCase() : null;
  return ROUTES.includes(r) ? r : 'home';
}

function renderAll() {
  state.route = parseHash();
  renderI18nChrome();
  renderWarningBar();
  renderDatebox();

  const view = $('#view');
  if (!state.bundle) {
    view.innerHTML = `<section class="card">
      <h2 class="card__title">${esc(state.error ? t('errorTitle') : t('loading'))}</h2>
      <div class="card__body">
        ${state.error ? `<p class="empty">${esc(state.error)}</p>` : ''}
        <div class="skeleton" style="width:70%"></div>
        <div class="skeleton" style="width:45%"></div>
        <div class="skeleton" style="width:55%"></div>
      </div>
    </section>`;
    return;
  }

  const map = {
    home: viewHome, overview: viewOverview, regional: viewRegional, analysis: viewAnalysis,
    lae: viewLae, imagery: viewImagery, forecast: viewForecast, alerts: viewAlerts, news: viewNews,
    rainfall: viewRainfall, uv: viewUv, visibility: viewVisibility, report: viewReport,
    yesterday: viewYesterday, climate: viewClimate, kp: viewKp, tc: viewTc,
    rainstorm: viewRainstorm, lightning: viewLightning, astronomy: viewAstronomy,
    tides: viewTides, earthquake: viewEarthquake, product: viewProduct,
    history: viewHistory, verdicts: viewVerdicts, runs: viewRuns, warningref: viewWarningRef,
  };
  view.innerHTML = (map[state.route] || viewHome)();

  if (state.route === 'regional') {
    const canvas = $('#chart3d');
    if (canvas) {
      const { rows, kind } = regionalRows();
      const isRain = kind === 'rain';
      const items = rows.map((r) => ({
        label: r.place, value: r.value,
        color: isRain ? rainColor(r.value) : tempColor(r.value),
        unitSuffix: isRain ? ` ${t('unitMm')}` : t('unitC'),
      }));
      state.chart.hover = null;
      canvas.style.cursor = 'crosshair';
      draw3DChart(canvas, items);
      bindChart(canvas, items);
    }
  }
}

/* ------------------------------------------------------------------ *
 * events
 * ------------------------------------------------------------------ */

function locateMe() {
  const btn = $('#locateBtn');
  if (!navigator.geolocation) return;
  if (btn) { btn.disabled = true; btn.textContent = t('locating'); }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      let best = null, bestD = Infinity;
      for (const s of HK_STATIONS) {
        const d = Math.hypot(s.lat - latitude, s.lon - longitude);
        if (d < bestD) { bestD = d; best = s; }
      }
      if (best && btn) {
        const name = best[state.lang] || best.tc;
        state.regional.filter = name;
        state.chart.hover = null;
        renderAll();
      }
    },
    () => { if (btn) { btn.disabled = false; btn.textContent = t('locate'); } },
    { timeout: 8000 }
  );
}

function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-on'), 2200);
}

/* Masthead toolbar. These are real controls, not decoration: HKO's toolbar has
 * the same affordances (text size, share, search, menu) and dead chrome would be
 * worse than not drawing it. */

const FS_STEPS = ['normal', 'lg', 'xl'];

function applyFontSize() {
  const size = FS_STEPS[state.fontSize] || 'normal';
  document.documentElement.classList.remove('fs-lg', 'fs-xl');
  if (size !== 'normal') document.documentElement.classList.add(`fs-${size}`);
}

function cycleFontSize() {
  state.fontSize = (state.fontSize + 1) % FS_STEPS.length;
  try { localStorage.setItem('hko.fontSize', String(state.fontSize)); } catch {}
  applyFontSize();
  toast(`${t('tbFont')}: ${FS_STEPS[state.fontSize] === 'normal' ? '100%' : (FS_STEPS[state.fontSize] === 'lg' ? '115%' : '130%')}`);
}

async function sharePage() {
  const url = location.href;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast(t('shareCopied'));
  } catch {
    toast(url);   // clipboard blocked (not https) — show it so it can be copied by hand
  }
}

function toggleSidebar() {
  const layout = $('#layout');
  const btn = $('#btnMenu');
  if (!layout) return;
  const hidden = layout.classList.toggle('side-collapsed');
  if (btn) btn.setAttribute('aria-expanded', String(!hidden));
}

function toggleSearch() {
  const form = $('#stationSearch');
  if (!form) return;
  form.hidden = !form.hidden;
  if (!form.hidden) {
    const inp = $('#searchInput');
    if (inp) inp.focus();
  }
}

function bindGlobalOnce() {
  window.addEventListener('hashchange', () => {
    state.route = parseHash();
    state.chart.hover = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
    if (state.route === 'analysis' && !state.analysis) loadAnalysis(false);
    if (state.route === 'lae' && !state.lae) loadLae(false);
    if (PRODUCT_ROUTES.includes(state.route)) ensureProducts();
  });

  document.body.addEventListener('click', (ev) => {
    const langBtn = ev.target.closest('.lang');
    if (langBtn) {
      const l = langBtn.dataset.lang;
      if (l && l !== state.lang) {
        state.lang = l;
        try { localStorage.setItem('hko-local-lang', l); } catch {}
        state.regional.filter = '';
        renderSidebar();          // labels are per-language, so the tree is rebuilt
        loadBundle(true);
      }
      return;
    }
    if (ev.target.closest('#refreshBtn')) { loadBundle(true); return; }

    if (ev.target.closest('#btnFont')) { cycleFontSize(); return; }
    if (ev.target.closest('#btnShare')) { sharePage(); return; }
    if (ev.target.closest('#btnMenu')) { toggleSidebar(); return; }
    if (ev.target.closest('#btnSearch')) { toggleSearch(); return; }

    const ds = ev.target.closest('[data-dataset]');
    if (ds) { state.regional.dataset = ds.dataset.dataset; state.chart.hover = null; renderAll(); return; }

    if (ev.target.closest('#locateBtn')) { locateMe(); return; }
    if (ev.target.closest('#clearFilter')) { state.regional.filter = ''; renderAll(); return; }

    if (ev.target.closest('[data-overlay-toggle]')) {
      state.showOverlay = !state.showOverlay;
      renderAll();
      return;
    }
    if (ev.target.closest('[data-analysis-refresh]')) {
      state.analysis = null;
      loadAnalysis(true);
      return;
    }
    if (ev.target.closest('[data-lae-refresh]')) {
      state.lae = null;
      loadLae(true);
      return;
    }

    const car = ev.target.closest('[data-carousel]');
    if (car) {
      const track = $('#fcTrack');
      if (track) track.scrollBy({ left: Number(car.dataset.carousel) * 396, behavior: 'smooth' });
      return;
    }

    const jump = ev.target.closest('[data-pick-jump]');
    if (jump) {
      state.regional.filter = jump.dataset.pickJump;
      state.chart.hover = null;
      // the anchor already points at #/regional; if we are there, re-render
      if (state.route === 'regional') { ev.preventDefault(); renderAll(); }
      return;
    }

    const th = ev.target.closest('th.sortable');
    if (th && th.dataset.sort === 'value') {
      const isRain = state.regional.dataset === 'rain';
      if (isRain) state.regional.sortDirRain = state.regional.sortDirRain === 'desc' ? 'asc' : 'desc';
      else state.regional.sortDir = state.regional.sortDir === 'desc' ? 'asc' : 'desc';
      state.chart.hover = null;
      renderAll();
      return;
    }
  });

  document.body.addEventListener('change', (ev) => {
    const p = ev.target.closest('[data-pick-param]');
    if (p) {
      state.picker.param = p.value;
      state.picker.station = null;   // stations differ per parameter
      renderAll();
      return;
    }
    const s = ev.target.closest('[data-pick-station]');
    if (s) {
      state.picker.station = s.value || null;
      renderAll();
      return;
    }

    // archive history controls
    const asrc = ev.target.closest('[data-arch-source]');
    if (asrc) {
      state.archive.kind = asrc.value;
      state.archive.station = null;          // stations differ between the two sources
      state.archive.series = null;
      state.archive.seriesKey = null;
      renderAll();
      return;
    }
    const ast = ev.target.closest('[data-arch-station]');
    if (ast) { state.archive.station = ast.value || null; renderAll(); return; }
    const amt = ev.target.closest('[data-arch-metric]');
    if (amt) { state.archive.metric = amt.value; renderAll(); return; }
  });

  const form = $('#stationSearch');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const q = ($('#searchInput') || {}).value || '';
      state.regional.filter = q.trim();
      state.chart.hover = null;
      if (state.route !== 'regional') location.hash = '#/regional';
      else renderAll();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.fetchedAt && Date.now() - state.fetchedAt > AUTO_REFRESH_MS) loadBundle(true);
  });
}

/* ------------------------------------------------------------------ *
 * boot
 * ------------------------------------------------------------------ */

(function boot() {
  try {
    const saved = localStorage.getItem('hko-local-lang');
    if (saved && I18N[saved]) state.lang = saved;
    const fs = localStorage.getItem('hko.fontSize');
    if (fs != null && FS_STEPS[Number(fs)]) state.fontSize = Number(fs);
  } catch {}
  if (!location.hash) location.hash = '#/home';
  state.route = parseHash();
  bindGlobalOnce();
  renderSidebar();
  applyFontSize();
  renderI18nChrome();
  renderStatus();
  loadBundle(false);
  scheduleAutoRefresh();
  // The analysis is heavier to compute and feeds the map overlay on every view,
  // so warm it once shortly after first paint rather than blocking the initial
  // render. If the user lands directly on the analysis route, fetch it at once.
  if (state.route === 'analysis') loadAnalysis(false);
  else setTimeout(() => loadAnalysis(false), 1200);
  // The LAE assessment is the heaviest of all (vector wind field plus two
  // external aviation feeds) and is only needed on its own view, so it is never
  // prefetched — but landing straight on #/lae must still fetch it.
  if (state.route === 'lae') loadLae(false);
  // The dated/climatological products are small but there are nine of them, so
  // they are warmed once in the background after first paint. Landing directly on
  // a page that needs them still triggers the fetch.
  if (PRODUCT_ROUTES.includes(state.route)) ensureProducts();
  else setTimeout(() => ensureProducts(), 2000);
})();
