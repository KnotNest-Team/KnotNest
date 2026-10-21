/**
 * Wedding traditions used to plan events automatically.
 * day: days relative to the main wedding day (0). side: who hosts / mainly attends.
 * optional: suggested but not added automatically (many families skip it or it happened already).
 * main: the core ceremony; it takes the couple's muhurat time when they enter one.
 * kind: shared type used to avoid duplicates when two traditions are combined.
 * Customs vary by region, community and family. These are starting points the couple can edit freely.
 */
const e = (key, kind, name, day, time, side, meaning, extra = {}) => ({ key, kind, name, day, time, side, meaning, ...extra });
const OPT = { optional: true };
const MAIN = { main: true };

export const TRADITIONS = {
  gujarati: {
    label: 'Gujarati', group: 'West India',
    events: [
      e('gol-dhana', 'engagement', 'Gol Dhana (Sagai)', -90, '11:00 AM', 'both', 'The engagement: the families share coriander seeds and jaggery (gol dhana) and exchange gifts to seal the match.', OPT),
      e('mandap-mahurat', 'puja', 'Mandap Mahurat & Ganesh Sthapana', -2, '10:00 AM', 'both', 'Prayers to Lord Ganesha and Mother Earth before the mandap is built, so the wedding goes smoothly.'),
      e('mehendi', 'mehendi', 'Mehendi', -2, '4:00 PM onwards', 'bride', "Henna is applied to the bride's hands and feet, with songs, music and dancing."),
      e('mameru', 'mameru', 'Mameru', -1, '12:00 PM', 'bride', "The bride's maternal uncle (mama) brings gifts such as the panetar saree, jewellery and sweets."),
      e('garba', 'sangeet', 'Garba & Dandiya Raas', -1, '8:00 PM onwards', 'both', 'A night of garba and dandiya raas, the traditional Gujarati folk dances, with both families.'),
      e('pithi', 'haldi', 'Pithi', 0, '9:00 AM', 'both', 'A paste of turmeric and sandalwood is applied to the bride and groom at their homes for a glow and good luck.'),
      e('jaan', 'baraat', 'Jaan (Baraat)', 0, '5:00 PM', 'groom', "The groom's procession arrives with music and dancing and is welcomed by the bride's mother at the door."),
      e('wedding', 'wedding', 'Wedding (Hast Melap & Pheras)', 0, '7:30 PM', 'both', "The couple's hands are joined (hast melap) and they take the pheras around the sacred fire.", MAIN),
      e('vidaai', 'vidaai', 'Vidaai', 0, '11:30 PM', 'bride', "The emotional farewell as the bride leaves her parents' home.", OPT),
      e('reception', 'reception', 'Reception', 1, '8:00 PM onwards', 'both', 'Dinner and celebrations to welcome the newly married couple.'),
    ],
  },
  marathi: {
    label: 'Marathi', group: 'West India',
    events: [
      e('sakhar-puda', 'engagement', 'Sakhar Puda', -90, '11:00 AM', 'both', "The engagement: the groom's family gives the bride a saree and a cone of sugar (sakhar puda) for a sweet beginning.", OPT),
      e('kelvan', 'kelvan', 'Kelvan', -3, '1:00 PM', 'both', 'Relatives host feasts (kelvan) for the bride and groom and their families before the wedding.'),
      e('mehendi', 'mehendi', 'Mehendi', -2, '4:00 PM onwards', 'bride', "Henna for the bride, now part of many Marathi weddings.", OPT),
      e('sangeet', 'sangeet', 'Sangeet', -2, '8:00 PM onwards', 'both', 'An evening of songs and dance by both families.', OPT),
      e('halad', 'haldi', 'Halad Chadavane', -1, '10:00 AM', 'both', 'Turmeric is applied to the groom first, and the rest is sent to the bride, blessing them both.'),
      e('devdevak', 'puja', 'Devdevak & Grahamakh', -1, '5:00 PM', 'both', 'The family deities are invited and prayers are offered so every ceremony goes smoothly.'),
      e('seemant-pujan', 'welcome', 'Seemant Pujan', -1, '7:00 PM', 'bride', "The bride's family welcomes the groom and his family with an aarti as a mark of respect."),
      e('wedding', 'wedding', 'Wedding (Antarpat, Mangalashtak & Saptapadi)', 0, '12:30 PM', 'both', 'A silk cloth (antarpat) separates the couple while mangalashtak verses are sung. It is lowered at the muhurat, they exchange garlands, and take seven steps together.', MAIN),
      e('vidaai', 'vidaai', 'Vidaai', 0, '5:00 PM', 'bride', "The bride's farewell from her parents' home.", OPT),
      e('grihapravesh', 'grihapravesh', 'Grihapravesh', 0, '7:00 PM', 'groom', 'The bride enters her new home by gently tipping over a measure of rice, a sign of prosperity.', OPT),
      e('reception', 'reception', 'Reception', 1, '8:00 PM onwards', 'both', 'Dinner and celebrations to welcome the newly married couple.'),
    ],
  },
  punjabi: {
    label: 'Punjabi (Hindu)', group: 'North India',
    events: [
      e('roka', 'roka', 'Roka', -120, '12:00 PM', 'both', 'The families formally accept the match and stop looking further, with gifts and blessings.', OPT),
      e('chunni', 'engagement', 'Chunni Chadana (Sagai)', -60, '7:00 PM', 'groom', "The groom's family visits the bride and drapes a red chunni over her head, welcoming her to the family.", OPT),
      e('sangeet', 'sangeet', 'Sangeet', -2, '8:00 PM onwards', 'both', 'An evening of boliyan, giddha, bhangra and dhol with both families.'),
      e('mehendi', 'mehendi', 'Mehendi', -1, '2:00 PM onwards', 'bride', "Henna is applied to the bride's hands and feet, with songs and dancing."),
      e('jaggo', 'jaggo', 'Jaggo', -1, '10:00 PM onwards', 'both', 'A late-night celebration where relatives carry a decorated pot of lamps (jaggo) through the neighbourhood, singing and dancing.'),
      e('chooda', 'chooda', 'Chooda & Kaleere', 0, '8:00 AM', 'bride', "The bride's maternal uncle gives her the red-and-ivory chooda bangles, and kaleere are tied to them."),
      e('vatna', 'haldi', 'Vatna (Haldi)', 0, '9:00 AM', 'both', 'A paste of turmeric and mustard oil (vatna) is applied to the bride and groom at their homes.'),
      e('sehrabandi', 'sehra', 'Sehrabandi', 0, '5:00 PM', 'groom', "The groom's sehra is tied and his family blesses him before the baraat leaves."),
      e('baraat', 'baraat', 'Baraat & Milni', 0, '7:00 PM', 'groom', 'The groom arrives with dhol and dancing. At milni, elders of both families embrace and exchange gifts.'),
      e('wedding', 'wedding', 'Wedding (Pheras)', 0, '11:00 PM', 'both', 'The couple takes the pheras around the sacred fire.', MAIN),
      e('doli', 'vidaai', 'Doli', 1, '5:00 AM', 'bride', "The bride's farewell; she throws puffed rice over her shoulder, wishing prosperity for her parents' home.", OPT),
      e('reception', 'reception', 'Reception', 1, '8:00 PM onwards', 'both', 'Dinner and dancing to welcome the newly married couple.'),
    ],
  },
  sikh: {
    label: 'Sikh', group: 'North India',
    events: [
      e('roka', 'roka', 'Roka', -120, '12:00 PM', 'both', 'The families formally accept the match, with gifts and blessings.', OPT),
      e('kurmai', 'engagement', 'Kurmai (Engagement)', -60, '11:00 AM', 'both', 'The engagement, often with an ardas (prayer); the groom receives a kara and gifts from the bride\'s family.', OPT),
      e('sangeet', 'sangeet', 'Sangeet', -2, '8:00 PM onwards', 'both', 'An evening of boliyan, giddha and bhangra with both families.'),
      e('vatna', 'haldi', 'Maiyan (Vatna)', -1, '10:00 AM', 'both', 'A paste of turmeric and oil (vatna) is applied to the bride and groom at their homes.'),
      e('mehendi', 'mehendi', 'Mehendi', -1, '2:00 PM onwards', 'bride', "Henna is applied to the bride's hands and feet."),
      e('jaggo', 'jaggo', 'Jaggo', -1, '10:00 PM onwards', 'both', 'A late-night celebration with a decorated pot of lamps, singing and dancing through the neighbourhood.'),
      e('chooda', 'chooda', 'Chooda & Kaleere', 0, '6:00 AM', 'bride', "The bride's maternal uncle gives her the chooda bangles, and kaleere are tied to them."),
      e('milni', 'baraat', 'Baraat & Milni', 0, '8:30 AM', 'groom', 'The groom and his family arrive at the gurdwara; elders of both families embrace and exchange gifts.'),
      e('anand-karaj', 'wedding', 'Anand Karaj (at the Gurdwara)', 0, '10:00 AM', 'both', 'The couple walks around the Guru Granth Sahib four times while the four laavan hymns are sung.', MAIN),
      e('doli', 'vidaai', 'Doli', 0, '3:00 PM', 'bride', "The bride's farewell from her family.", OPT),
      e('reception', 'reception', 'Reception', 0, '8:00 PM onwards', 'both', 'Dinner and dancing to celebrate the newly married couple.'),
    ],
  },
  rajasthani: {
    label: 'Rajasthani / Marwari', group: 'North India',
    events: [
      e('tilak', 'engagement', 'Tilak', -60, '11:00 AM', 'bride', "The bride's brother applies a tilak to the groom's forehead and the families exchange gifts.", OPT),
      e('mehendi', 'mehendi', 'Mehendi', -2, '4:00 PM onwards', 'bride', "Henna is applied to the bride's hands and feet with folk songs."),
      e('pithi', 'haldi', 'Pithi Dastoor', -1, '9:00 AM', 'both', 'Turmeric and sandalwood paste (pithi) is applied to the bride and groom at their homes.'),
      e('mayra', 'mameru', 'Mayra (Bhaat)', -1, '12:00 PM', 'both', "The mother's family arrives with clothes, jewellery and gifts, a cherished Marwari custom."),
      e('sangeet', 'sangeet', 'Sangeet', -1, '8:00 PM onwards', 'both', 'An evening of ghoomar, folk songs and dance with both families.'),
      e('baraat', 'baraat', 'Baraat & Toran', 0, '7:00 PM', 'groom', "The groom arrives in procession and touches the toran at the bride's door before entering."),
      e('wedding', 'wedding', 'Wedding (Pheras)', 0, '10:00 PM', 'both', 'The couple takes the pheras around the sacred fire.', MAIN),
      e('vidaai', 'vidaai', 'Vidaai', 1, '6:00 AM', 'bride', "The bride's farewell from her parents' home.", OPT),
      e('reception', 'reception', 'Reception', 1, '8:00 PM onwards', 'both', 'Dinner and celebrations to welcome the newly married couple.'),
    ],
  },
  tamil: {
    label: 'Tamil', group: 'South India',
    events: [
      e('nichayathartham', 'engagement', 'Nichayathartham', -60, '11:00 AM', 'both', 'The formal engagement: the families exchange trays of betel leaves, fruit and gifts and fix the muhurtham.', OPT),
      e('panda-kaal', 'puja', 'Panda Kaal Muhurtham', -1, '9:00 AM', 'both', 'Prayers to a bamboo pole, invoking blessings before the wedding begins.'),
      e('vratham', 'puja', 'Vratham', -1, '11:00 AM', 'both', 'Prayers at both homes for the blessings of the deities and ancestors; a protective thread (kaapu) is tied.'),
      e('reception', 'reception', 'Reception', -1, '7:00 PM onwards', 'both', 'In many Tamil weddings the reception is the evening before the muhurtham.'),
      e('janavasam', 'welcome', 'Janavasam', -1, '6:00 PM', 'groom', 'The groom is welcomed in a procession on the eve of the wedding.', OPT),
      e('kashi-yatra', 'kashi-yatra', 'Kashi Yatra', 0, '6:00 AM', 'groom', "The groom playfully sets off for Kashi to become an ascetic, and the bride's father persuades him to marry his daughter instead."),
      e('oonjal', 'oonjal', 'Oonjal', 0, '6:30 AM', 'both', 'The couple sits on a swing while women sing and circle them with coloured rice balls to ward off the evil eye.'),
      e('wedding', 'wedding', 'Muhurtham (Kanyadanam & Mangalya Dharanam)', 0, '7:30 AM', 'both', "The bride sits on her father's lap for kanyadanam; at the muhurtham the groom ties the thali, and they take the seven steps.", MAIN),
    ],
  },
  telugu: {
    label: 'Telugu', group: 'South India',
    events: [
      e('nischitartham', 'engagement', 'Nischitartham', -60, '11:00 AM', 'both', 'The formal engagement, where the families agree on the match and exchange gifts.', OPT),
      e('pellikuthuru', 'haldi', 'Pellikuthuru & Pellikoduku', -1, '10:00 AM', 'both', 'The bride and groom are bathed with turmeric and oil and dressed as bride and groom at their homes.'),
      e('snathakam', 'puja', 'Snathakam', 0, '6:00 AM', 'groom', "A ceremony at the groom's home marking his readiness for married life.", OPT),
      e('kashi-yatra', 'kashi-yatra', 'Kashi Yatra', 0, '7:00 AM', 'groom', "The groom playfully sets off for Kashi, and the bride's family persuades him to stay and marry."),
      e('wedding', 'wedding', 'Wedding (Jeelakarra Bellam, Mangalsutra & Talambralu)', 0, '10:00 AM', 'both', "At the muhurtham the couple places cumin and jaggery paste on each other's heads, the groom ties the mangalsutra, and they shower each other with rice.", MAIN),
      e('appagintalu', 'vidaai', 'Appagintalu', 0, '4:00 PM', 'bride', "The bride's parents formally entrust her to the groom's family."),
      e('reception', 'reception', 'Reception', 1, '7:30 PM onwards', 'both', 'Dinner and celebrations for the newly married couple.'),
    ],
  },
  kannada: {
    label: 'Kannada', group: 'South India',
    events: [
      e('nischitartha', 'engagement', 'Nischitartha', -60, '11:00 AM', 'both', 'The formal engagement and exchange of gifts between the families.', OPT),
      e('devara-samaradhane', 'puja', 'Devara Samaradhane', -1, '10:00 AM', 'both', 'Prayers to the family deity at both homes for a smooth wedding.'),
      e('naandi', 'puja', 'Naandi', -1, '12:00 PM', 'both', "A sacred pot (kalasha) is worshipped to invoke the ancestors' blessings."),
      e('kashi-yatre', 'kashi-yatra', 'Kashi Yatre', 0, '7:00 AM', 'groom', "The groom playfully sets off for Kashi until the bride's brother persuades him to marry."),
      e('wedding', 'wedding', 'Wedding (Dhare Herdu & Mangalya Dharane)', 0, '9:30 AM', 'both', "The bride's parents pour water over the couple's joined hands as they give her away; the groom ties the mangalsutra and they take the seven steps.", MAIN),
      e('griha-pravesha', 'grihapravesh', 'Griha Pravesha', 0, '6:00 PM', 'groom', 'The bride is welcomed into her new home.', OPT),
      e('reception', 'reception', 'Reception', 0, '7:30 PM onwards', 'both', 'Dinner and celebrations for the newly married couple.'),
    ],
  },
  malayali: {
    label: 'Malayali (Hindu)', group: 'South India',
    events: [
      e('nischayam', 'engagement', 'Nischayam', -60, '11:00 AM', 'both', 'The engagement, where elders of both families confirm the match.', OPT),
      e('mehendi', 'mehendi', 'Mehendi', -1, '5:00 PM onwards', 'bride', 'Henna for the bride, now part of many Kerala weddings.', OPT),
      e('wedding', 'wedding', 'Wedding (Thalikettu)', 0, '10:30 AM', 'both', 'A short ceremony at the muhurtham: the groom ties the thali, gives the bride a pudava (cloth), and they circle the lit lamp.', MAIN),
      e('sadya', 'feast', 'Sadya (Wedding Feast)', 0, '12:30 PM', 'both', 'A traditional vegetarian feast served on banana leaves.'),
      e('reception', 'reception', 'Reception', 0, '7:00 PM onwards', 'both', 'An evening celebration for friends and family.', OPT),
    ],
  },
  bengali: {
    label: 'Bengali', group: 'East India',
    events: [
      e('ashirbad', 'engagement', 'Ashirbad', -3, '11:00 AM', 'both', 'Elders of each family bless the bride and groom with paddy, durva grass and gifts.'),
      e('aiburobhaat', 'feast', 'Aiburobhaat', -2, '1:00 PM', 'both', 'The last meal the bride and groom eat as unmarried people, lovingly prepared by their families.'),
      e('dodhi-mongol', 'puja', 'Dodhi Mongol', 0, '5:00 AM', 'both', 'Before sunrise, the bride and groom eat curd and flattened rice, then fast until the wedding.', OPT),
      e('gaye-holud', 'haldi', 'Gaye Holud', 0, '9:00 AM', 'both', 'Turmeric is first applied to the groom, and the rest is sent with gifts (tattva) to the bride.'),
      e('bor-jatri', 'baraat', 'Bor Jatri', 0, '6:00 PM', 'groom', "The groom's party arrives and is welcomed with conch shells and ululation."),
      e('wedding', 'wedding', 'Wedding (Shubho Drishti, Mala Badal & Sindoor Daan)', 0, '8:00 PM', 'both', 'The bride, hiding her face with betel leaves, looks at the groom for the first time; they exchange garlands, she is given away, and the groom applies sindoor.', MAIN),
      e('bashor-raat', 'night', 'Bashor Raat', 0, '11:00 PM', 'both', 'Family stays up through the night with the couple, playing games and singing.', OPT),
      e('bidaai', 'vidaai', 'Bidaai', 1, '10:00 AM', 'bride', "The bride's farewell from her parents' home."),
      e('bou-bhaat', 'reception', 'Bou Bhaat & Reception', 2, '7:30 PM onwards', 'groom', "The bride serves food to the groom's family for the first time, followed by the reception hosted by the groom's family."),
    ],
  },
  nikah: {
    label: 'Muslim (Nikah)', group: 'Faith',
    events: [
      e('mangni', 'engagement', 'Mangni', -60, '7:00 PM', 'both', 'The engagement, where the families exchange rings and gifts.', OPT),
      e('manjha', 'haldi', 'Manjha (Haldi)', -2, '11:00 AM', 'both', 'Turmeric paste is applied to the bride and groom, a custom in many Indian Muslim families.', OPT),
      e('mehendi', 'mehendi', 'Mehendi', -1, '5:00 PM onwards', 'bride', "Henna is applied to the bride's hands and feet, with songs and dholak."),
      e('nikah', 'wedding', 'Nikah', 0, '12:00 PM', 'both', 'The qazi reads the marriage contract; the bride and groom each give their consent and sign the nikahnama before witnesses.', MAIN),
      e('rukhsati', 'vidaai', 'Rukhsati', 0, '5:00 PM', 'bride', "The bride's farewell from her family home."),
      e('walima', 'reception', 'Walima', 1, '8:00 PM onwards', 'groom', "The wedding feast hosted by the groom's family to celebrate the marriage."),
    ],
  },
  christian: {
    label: 'Christian', group: 'Faith',
    events: [
      e('engagement', 'engagement', 'Engagement', -90, '6:00 PM', 'both', 'The couple exchanges rings in front of family and friends.', OPT),
      e('roce', 'haldi', 'Roce', -1, '5:00 PM', 'both', 'In Goan and Mangalorean families, coconut milk and oil are applied to the bride and groom at their homes as a blessing.', OPT),
      e('wedding', 'wedding', 'Church Wedding (Holy Matrimony)', 0, '11:00 AM', 'both', 'The couple exchanges vows and rings during the nuptial mass or service.', MAIN),
      e('reception', 'reception', 'Reception', 0, '7:30 PM onwards', 'both', 'Dinner, toasts, the first dance and cake cutting.'),
    ],
  },
  modern: {
    label: 'Modern / Destination', group: 'Other',
    events: [
      e('welcome', 'welcome', 'Welcome Dinner', -1, '7:30 PM', 'both', 'A relaxed dinner to welcome guests as they arrive.'),
      e('haldi', 'haldi', 'Haldi', 0, '10:00 AM', 'both', 'A fun morning of turmeric and flowers.', OPT),
      e('mehendi', 'mehendi', 'Mehendi', -1, '3:00 PM onwards', 'bride', 'Henna, music and an easy afternoon with close family and friends.', OPT),
      e('sangeet', 'sangeet', 'Sangeet', -1, '8:00 PM onwards', 'both', 'Performances and dancing by family and friends.', OPT),
      e('wedding', 'wedding', 'Wedding Ceremony', 0, '5:00 PM', 'both', 'The ceremony where the couple says their vows.', MAIN),
      e('after-party', 'reception', 'Reception & After-party', 0, '8:00 PM onwards', 'both', 'Dinner, toasts and dancing into the night.'),
      e('brunch', 'feast', 'Farewell Brunch', 1, '11:00 AM', 'both', 'A slow brunch to say goodbye to guests.', OPT),
    ],
  },
};

export const traditionList = () => Object.entries(TRADITIONS).map(([key, t]) => ({ key, label: t.label, group: t.group }));

/** Checklist tasks with how many days before the wedding they are due. */
export const TASK_LEAD_DAYS = {
  'Book Venue': 300, 'Book Photographer': 240, 'Book Decorator': 180, 'Book Makeup Artist': 150, 'Finalize Catering': 120,
  'Buy Wedding Outfits': 90, 'Book Jewellery': 90, 'Send Invitations': 45, 'Book Transportation': 30, 'Final Vendor Confirmation': 7,
};

/** Invitation design for each tradition (the couple can override it). */
export const THEME_FOR = {
  rajasthani: 'royal', gujarati: 'gujarati', marathi: 'marathi', punjabi: 'punjabi', sikh: 'punjabi',
  tamil: 'south', telugu: 'south', kannada: 'south', malayali: 'south', bengali: 'bengali', nikah: 'nikah', christian: 'christian', modern: 'modern',
};
export const themeFor = (w) => w?.inviteTheme || THEME_FOR[w?.culture] || 'royal';
