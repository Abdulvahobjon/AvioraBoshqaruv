// O'zbekiston viloyatlari va tumanlari (shaharlar bilan).
export const UZ_REGIONS = [
  {
    name: 'Toshkent shahri',
    districts: ['Bektemir', 'Chilonzor', 'Mirobod', 'Mirzo Ulug\'bek', 'Sergeli', 'Shayxontohur', 'Olmazor', 'Uchtepa', 'Yakkasaroy', 'Yashnobod', 'Yunusobod', 'Yangihayot'],
  },
  {
    name: 'Toshkent viloyati',
    districts: ['Bekobod', 'Bo\'ka', 'Bo\'stonliq', 'Chinoz', 'Qibray', 'Ohangaron', 'Oqqo\'rg\'on', 'Parkent', 'Piskent', 'Quyichirchiq', 'O\'rtachirchiq', 'Yangiyo\'l', 'Yuqorichirchiq', 'Zangiota', 'Olmaliq shahri', 'Angren shahri', 'Chirchiq shahri', 'Nurafshon shahri'],
  },
  {
    name: 'Andijon viloyati',
    districts: ['Andijon', 'Asaka', 'Baliqchi', 'Bo\'ston', 'Buloqboshi', 'Izboskan', 'Jalaquduq', 'Xo\'jaobod', 'Qo\'rg\'ontepa', 'Marhamat', 'Oltinko\'l', 'Paxtaobod', 'Shahrixon', 'Ulug\'nor', 'Andijon shahri', 'Xonobod shahri'],
  },
  {
    name: 'Buxoro viloyati',
    districts: ['Buxoro', 'G\'ijduvon', 'Jondor', 'Kogon', 'Olot', 'Peshku', 'Qorako\'l', 'Qorovulbozor', 'Romitan', 'Shofirkon', 'Vobkent', 'Buxoro shahri', 'Kogon shahri'],
  },
  {
    name: 'Farg\'ona viloyati',
    districts: ['Bag\'dod', 'Beshariq', 'Buvayda', 'Dang\'ara', 'Farg\'ona', 'Furqat', 'Qo\'shtepa', 'Quva', 'Rishton', 'So\'x', 'Toshloq', 'Uchko\'prik', 'O\'zbekiston', 'Yozyovon', 'Farg\'ona shahri', 'Marg\'ilon shahri', 'Qo\'qon shahri', 'Quvasoy shahri'],
  },
  {
    name: 'Jizzax viloyati',
    districts: ['Arnasoy', 'Baxmal', 'Do\'stlik', 'Forish', 'G\'allaorol', 'Sharof Rashidov', 'Mirzacho\'l', 'Paxtakor', 'Yangiobod', 'Zarbdor', 'Zafarobod', 'Zomin', 'Jizzax shahri'],
  },
  {
    name: 'Xorazm viloyati',
    districts: ['Bog\'ot', 'Gurlan', 'Xonqa', 'Hazorasp', 'Xiva', 'Qo\'shko\'pir', 'Shovot', 'Urganch', 'Yangiariq', 'Yangibozor', 'Urganch shahri', 'Xiva shahri'],
  },
  {
    name: 'Namangan viloyati',
    districts: ['Chortoq', 'Chust', 'Kosonsoy', 'Mingbuloq', 'Namangan', 'Norin', 'Pop', 'To\'raqo\'rg\'on', 'Uchqo\'rg\'on', 'Uychi', 'Yangiqo\'rg\'on', 'Namangan shahri'],
  },
  {
    name: 'Navoiy viloyati',
    districts: ['Karmana', 'Konimex', 'Navbahor', 'Nurota', 'Qiziltepa', 'Tomdi', 'Uchquduq', 'Xatirchi', 'Navoiy shahri', 'Zarafshon shahri'],
  },
  {
    name: 'Qashqadaryo viloyati',
    districts: ['Chiroqchi', 'Dehqonobod', 'G\'uzor', 'Kasbi', 'Kitob', 'Koson', 'Mirishkor', 'Muborak', 'Nishon', 'Qamashi', 'Qarshi', 'Shahrisabz', 'Yakkabog\'', 'Ko\'kdala', 'Qarshi shahri', 'Shahrisabz shahri'],
  },
  {
    name: 'Samarqand viloyati',
    districts: ['Bulung\'ur', 'Ishtixon', 'Jomboy', 'Kattaqo\'rg\'on', 'Qo\'shrabot', 'Narpay', 'Nurobod', 'Oqdaryo', 'Pastdarg\'om', 'Payariq', 'Paxtachi', 'Samarqand', 'Tayloq', 'Urgut', 'Samarqand shahri', 'Kattaqo\'rg\'on shahri'],
  },
  {
    name: 'Sirdaryo viloyati',
    districts: ['Boyovut', 'Guliston', 'Mirzaobod', 'Oqoltin', 'Sayxunobod', 'Sardoba', 'Sirdaryo', 'Xovos', 'Guliston shahri', 'Shirin shahri', 'Yangiyer shahri'],
  },
  {
    name: 'Surxondaryo viloyati',
    districts: ['Angor', 'Bandixon', 'Boysun', 'Denov', 'Jarqo\'rg\'on', 'Qiziriq', 'Qumqo\'rg\'on', 'Muzrabot', 'Oltinsoy', 'Sariosiyo', 'Sherobod', 'Sho\'rchi', 'Termiz', 'Uzun', 'Termiz shahri'],
  },
  {
    name: 'Qoraqalpog\'iston Respublikasi',
    districts: ['Amudaryo', 'Beruniy', 'Bo\'zatov', 'Chimboy', 'Ellikqal\'a', 'Kegeyli', 'Mo\'ynoq', 'Nukus', 'Qanliko\'l', 'Qo\'ng\'irot', 'Qorao\'zak', 'Shumanay', 'Taxtako\'pir', 'To\'rtko\'l', 'Xo\'jayli', 'Nukus shahri'],
  },
];

export const REGION_NAMES = UZ_REGIONS.map((r) => r.name);
export function districtsOf(regionName) {
  return UZ_REGIONS.find((r) => r.name === regionName)?.districts || [];
}
