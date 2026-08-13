(function () {
  'use strict';

  /* =====================================================================
     I18N — English / Swahili translation.
     Pages mark text with data-i18n (text), data-i18n-ph (placeholder) and
     data-i18n-aria (aria-label). The active language is stored in
     localStorage ('maranathaLang').
     ===================================================================== */

  const LS_KEY = 'maranathaLang';

  class I18n {
    static DICTS = {
      site: {
        en: {},
        sw: {
          'skip': 'Ruka hadi maudhui',
          'nav.home': 'Nyumbani',
          'nav.about': 'Kuhusu Sisi',
          'nav.works': 'Kazi Zetu',
          'nav.events': 'Matukio',
          'nav.team': 'Uongozi',
          'nav.gallery': 'Picha',
          'nav.members': 'Wanachama',
          'nav.portal': 'Portal ya Wanachama',
          'nav.join': 'Jiunge Nasi',
          'nav.donate': 'Changia',
          'nav.contact': 'Wasiliana',
          'hero.h1a': 'Tunamsifu Bwana',
          'hero.h1b': 'kwa',
          'hero.h1c': 'Sauti Moja',
          'hero.sub1': 'Kwaya ya Maranatha — kwaya ya Kikatoliki yenye makao yake Dar es Salaam, Tanzania.',
          'hero.sub2': 'Ibada, nidhamu, urafiki na ubora wa muziki.',
          'hero.bt1': 'Gundua hadithi yetu',
          'hero.bt2': '\u25B6 Sikiliza muziki wetu',
          'hero.stat1': 'Wanachama',
          'hero.stat2': 'Miaka',
          'hero.stat3': 'Matamasha',
          'hero.stat4': 'Albamu',
          'feat.h1': 'Huduma ya Kwaya',
          'feat.b1': 'Imani, utumishi na ibada katika kila wimbo tunaoimba.',
          'feat.h2': 'Washindi wa Tuzo',
          'feat.b2': 'Kusherehekea mafanikio na hatua muhimu kwa pamoja.',
          'feat.h3': 'Vyombo vya Habari',
          'feat.b3': 'Video, picha na hadithi kutoka safari yetu.',
          'feat.h4': 'Jamii Imara',
          'feat.b4': 'Urafiki, maombi na ukuzi wa kiroho kupitia muziki.',
          'about.label': 'Karibu Maranatha',
          'about.title': 'Zaidi ya kwaya tu',
          'about.sub': 'Kwaya iliyojawa roho inayojitolea kuinua ibada na kutumikia jamii kupitia muziki.',
          'about.p1': 'Kwaya ya Maranatha ni kwaya ya kujitolea yenye makao yake Dar es Salaam, Tanzania. Ilianzishwa kwa imani kwamba muziki ni aina ya maombi yenye nguvu; tunajitahidi kuiongoza jamii yetu kwenye ibada ya dhati na kukutana na Mungu.',
          'about.p2': 'Wanachama wetu wanatoka katika asili mbalimbali — wote wameunganishwa na imani na upendo wa muziki takatifu. Tunahudumia misa za Jumapili, sherehe za sikukuu, matukio maalum na hafla za jamii mwaka mzima.',
          'about.s1': 'Wanachama hai',
          'about.s2': 'Miaka ya huduma',
          'about.s3': 'Matamasha',
          'about.badge': 'Ilianzishwa Dar es Salaam',
          'val.label': 'Tunachothamini',
          'val.title': 'Huduma ya wimbo, nidhamu na sala',
          'val.sub': 'Maranatha haina wimbo tu. Tunajishughulisha na akili na roho zetu katika kila tunachofanya, tukiwa daima katika huduma ya jamii yetu.',
          'val.c1': 'Karibu Kila Mtu',
          'val.c1p': 'Jamii ya kwaya ya Kikatoliki inayowakaribisha waimbaji, wafuasi na waabudu.',
          'val.c2': 'Matukio na Misa za Moja kwa Moja',
          'val.c2p': 'Misa za moja kwa moja, sherehe za kanisani, matamasha na matukio maalum ya ibada.',
          'val.c3': 'Tuzo na Utambuzi',
          'val.c3p': 'Hatua muhimu kama Kwaya Bora ya Mwaka na mafanikio mengine mashuhuri.',
          'val.c4': 'Muziki na Maktaba',
          'val.c4p': 'Rekodi, nyaraka, kumbukumbu na maktaba inayokua ya nyimbo takatifu.',
          'val.c5': 'Jamii Imara',
          'val.c5p': 'Urafiki, nidhamu, maisha ya maombi na ukuzi wa kiroho kupitia huduma ya muziki.',
          'val.c6': 'Uongozi na Huduma',
          'val.c6p': 'Viongozi waliojitolea, muundo wa timu na huduma kwa parokia na zaidi.',
          'st.label': 'Hadithi zetu',
          'st.title': 'Sauti nyuma ya muziki',
          'st.sub': 'Dhamira, ushuhuda na upande wa kibinadamu wa Kwaya ya Maranatha.',
          'st.q1': 'Kuimba na Maranatha ni zaidi ya onyesho. Ni maombi, familia na njia ya furaha ya kumtumikia Mungu kila wiki.',
          'st.q2': 'Kuanzia mazoezi yetu ya kwanza hadi Gala ya Krismasi, kwaya hii imekuwa familia yangu ya pili. Harmonia iko ndani ya watu.',
          'st.q3': 'Kila Jumapili tunaitayarisha mioyo yetu kwa pamoja. Nidhamu na maisha ya maombi ndiyo yanayofanya ibada yetu iwe maalum.',
          'st.n1': 'Mkurugenzi wa Kwaya',
          'st.r1': 'Soprano na Uongozi',
          'st.n2': 'Mkurugenzi Msaidizi wa Muziki',
          'st.r2': 'Muziki na Mazoezi',
          'st.n3': 'Kiongozi wa Sehemu',
          'st.r3': 'Kiongozi wa Soprano',
          'mu.label': 'Kazi zetu',
          'mu.title': 'Muziki na Rekodi',
          'mu.sub': 'Sikiliza rekodi zetu na utazame matamasha ya moja kwa moja kutoka huduma na matamasha yetu.',
          'mu.cta': 'Omba orodha kamili ya nyimbo zetu',
          'plr.note': 'Uchezaji wa mfano kwa kuangalia tu — badilisha na rekodi zako halisi ukiwa tayari.',
          'ev.label': 'Kalenda',
          'ev.title': 'Matukio Yajayo',
          'ev.sub': 'Jiunge nasi kwa ibada, matamasha na sherehe za jamii mwaka mzima.',
          'ev.next': 'Tukio lijalo',
          'ev.d': 'Siku',
          'ev.h': 'Saa',
          'ev.m': 'Dakika',
          'ev.s': 'Sekunde',
          'ev.med': 'Matangazo ya media',
          'ev.rp': 'Matamasha ya hivi karibuni',
          'nw.label': 'Habari na matangazo',
          'nw.title': 'Kutoka kwenye maisha ya kwaya',
          'nw.sub': 'Matangazo, muhtasari na taarifa za jamii kutoka Kwaya ya Maranatha.',
          'tm.label': 'Uongozi',
          'tm.title': 'Kutana na Timu',
          'tm.sub': 'Watu waliojitolea wanaoongoza, kupanga na kuhamasisha Kwaya ya Maranatha.',
          'ms.label': 'Wanachama',
          'ms.title': 'Sauti zetu',
          'ms.sub': 'Waimbaji wanaoleta harmonia yetu — wamegawanywa kwa sehemu za sauti.',
          'ga.label': 'Kumbukumbu',
          'ga.title': 'Picha',
          'ga.sub': 'Nyakati zilizonaswa kutoka matamasha, sherehe na maisha ya kwaya.',
          'ga.cta': 'Shirikisha picha zako nasi',
          'jo.label': 'Jiunge',
          'jo.title': 'Mahojiano na kuwa mwanachama',
          'jo.sub': 'Tunakaribisha sauti mpya kutoka parokia yetu na nje yake. Leta upendo wa muziki wa ibada — uzoefu ni mzuri kuwa nao, lakini si lazima.',
          'jo.vp': 'Sehemu za sauti',
          'jo.vpv': 'Soprano · Alto · Tenor · Bass',
          'jo.reh': 'Mazoezi',
          'jo.rehv': 'Alhamisi · 6:30 PM',
          'jo.ven': 'Mahali',
          'jo.venv': 'Ukumbi wa Parokia, Dar es Salaam',
          'jo.open': 'Kwa sasa tunafungua kwa',
          'jo.name': 'Jina kamili',
          'jo.email': 'Barua pepe',
          'jo.vpart': 'Sehemu ya sauti\u2026',
          'jo.exp': 'Uzoefu\u2026',
          'jo.beg': 'Msingi',
          'jo.mid': 'Kati',
          'jo.adv': 'Juu',
          'jo.msg': 'Tuambie kidogo kukuhusu...',
          'jo.ok': 'Asante! Ombi lako la mahojiano limepokelewa. Tutawasiliana nawe.',
          'jo.btn': 'Omba mahojiano \u2192',
          'do.label': 'Saidia huduma yetu',
          'do.title': 'Changia na Usaidie',
          'do.sub': 'Ukarimu wako unaiweka hai huduma yetu ya muziki — kuanzia mavazi na vyombo vya kwaya hadi usafiri na gharama za matukio.',
          'do.c1': 'Mchangiaji',
          'do.c1p': 'Inashughulikia vifaa vya mazoezi, uchapishaji wa noti na usafiri kwa wiki moja.',
          'do.c2': 'Mfadhili',
          'do.c2p': 'Inasaidia kufadhili vyombo vipya, mavazi ya kwaya na utayarishaji wa tamasha letu la mwaka.',
          'do.c3': 'Mfadhili Mkuu',
          'do.c3p': 'Shirikiana nasi kwenye miradi maalum, rekodi, media na ufikiaji wa jamii.',
          'do.donate': 'Changia',
          'do.talk': 'Zungumza nasi',
          'cta.label': 'Anza safari yako',
          'cta.title': 'Jiunge na familia yetu ya sauti',
          'cta.sub': 'Iwe unaweza kuimba, kucheza ala, au kupenda tu muziki wa ibada — kuna nafasi kwako kwenye Kwaya ya Maranatha.',
          'cta.bt1': 'Jiunge na kwaya',
          'cta.bt2': 'Angalia matukio yajayo',
          'co.label': 'Wasiliana nasi',
          'co.title': 'Wasiliana Nasi',
          'co.sub': 'Tufikie kwa ajili ya kutumbuiza, ushirikiano au maswali. Tungependa kusikia kutoka kwako.',
          'co.loc': 'Mahali',
          'co.locv': 'Dar es Salaam, Tanzania',
          'co.em': 'Barua pepe',
          'co.phone': 'Simu',
          'co.follow': 'Tufuate',
          'co.name': 'Jina lako',
          'co.email': 'Barua pepe',
          'co.subj': 'Mada',
          'co.msg': 'Ujumbe wako...',
          'co.ok': 'Asante! Ujumbe wako umetumwa. Tutawasiliana nawe hivi karibuni.',
          'co.send': 'Tuma ujumbe \u2192',
          'ft.p': 'Kwaya ya Maranatha — huduma ya wimbo, nidhamu na sala katika jamii ya Kikatoliki ya Dar es Salaam, Tanzania.',
          'ft.ql': 'Viungo vya Haraka',
          'ft.mm': 'Muziki na Media',
          'ft.mm1': 'Rekodi Zetu',
          'ft.c': 'Wasiliana',
          'ft.stay': 'Jiunge na taarifa zetu',
          'ft.stayp': 'Pokea tarehe za matamasha, habari na rekodi zetu kwenye barua pepe yako.',
          'ft.sub': 'Jisajili',
          'ft.subph': 'Barua pepe yako',
          'ft.ok': 'Asante kwa kujisajili!',
          'lb.close': 'Funga',
          'lb.prev': 'Picha ya awali',
          'lb.next': 'Picha inayofuata',
          'totop': 'Rudi juu'
        }
      },
      portal: {
        en: {
          'portal.label': 'Member access',
          'portal.title': 'Member Portal',
          'portal.sub': 'Sign in to manage your membership, RSVP to events and access resources — leaders and admins get extra tools.',
          'portal.role.member': 'Member',
          'portal.role.leader': 'Leader',
          'portal.role.section_leader': 'Section Leader',
          'portal.role.admin': 'Admin',
          'portal.you': '(you)',
          'portal.pend.title': 'Account awaiting approval',
          'portal.pend.sub': 'An admin must approve your registration before you can use the portal. If you joined with an invite link, check that you signed up with the same email the invite was sent to.',
          'portal.pend.rejected': 'Your registration was not approved. Contact the choir leadership if you believe this is a mistake.',
          'portal.invite.activating': 'Invite found — activating your account...',
          'portal.next': 'Next event',
          'portal.events': 'Upcoming events',
          'portal.anno': 'Announcements',
          'portal.noevents': 'No upcoming events yet — the leaders will add them soon.',
          'portal.noanno': 'No announcements yet.',
          'portal.rsvp': 'Your RSVP',
          'portal.rsvp.attending': "I'll be there",
          'portal.rsvp.not_attending': "Can't make it",
          'portal.rsvp.maybe': 'Maybe',
          'portal.rsvp.none': 'Not answered',
          'portal.rsvp.err': 'Could not update your RSVP.',
          'portal.rsvp.mandatory': 'Attendance expected',
          'portal.invite': 'Invite a member',
          'portal.invite.email': "Member's email",
          'portal.invite.role': 'Access level',
          'portal.invite.btn': 'Create invite link',
          'portal.invite.note': 'Share this link with the member. They sign up through it and are activated automatically after confirming their email.',
          'portal.invite.link': 'Invite link',
          'portal.invite.copy': 'Copy',
          'portal.invite.copied': 'Copied!',
          'portal.invite.err': 'Could not create the invite link.',
          'portal.pending': 'Pending registrations',
          'portal.pending.none': 'No registrations waiting for approval.',
          'portal.approve': 'Approve',
          'portal.reject': 'Reject',
          'portal.approved': 'Member approved.',
          'portal.rejected': 'Member rejected.',
          'portal.status.err': 'Could not update member status.'
        },
        sw: {
          'portal.label': 'Ufikiaji wa wanachama',
          'portal.title': 'Portal ya Wanachama',
          'portal.sub': 'Ingia ili kusimamia uanachama wako, uthibitishe matukio na kupata rasilimali — viongozi na admin wanapata zana za ziada.',
          'portal.back': 'Rudi kwenye tovuti',
          'portal.admin': 'Panel ya Admin',
          'portal.tab1': 'Ingia',
          'portal.tab2': 'Jisajili',
          'portal.wb': 'Karibu tena',
          'portal.sihint': 'Ingia ili upate rasilimali za wanachama, nyenzo za uongozi na zana za admin.',
          'portal.email': 'Barua pepe',
          'portal.pass': 'Nenosiri',
          'portal.passph': 'Nenosiri lako',
          'portal.sibtn': 'Ingia',
          'portal.google': 'Endelea kwa Google',
          'portal.or': 'au',
          'portal.forgot': 'Umesahau nenosiri?',
          'portal.forgothint': '\u2014 tutakutumia kiungo cha kuweka upya kwa barua pepe.',
          'portal.su1': 'Unda akaunti yako',
          'portal.suhint': 'Akaunti zinahifadhiwa kwa usalama kwenye hifadhidata ya Supabase ya kwaya. Kila mtu huanza kama Mwanachama; viongozi na admin hutengwa na admin baada ya kujisajili.',
          'portal.fullname': 'Jina kamili',
          'portal.supass': 'Nenosiri (angalau herufi 6)',
          'portal.supassph': 'Chagua nenosiri',
          'portal.supart': 'Sehemu ya sauti (si lazima)',
          'portal.none': 'Haijachaguliwa',
          'portal.subtn': 'Unda akaunti',
          'portal.rs1': 'Weka nenosiri jipya',
          'portal.rshint': 'Chagua nenosiri jipya la akaunti yako.',
          'portal.rslabel': 'Nenosiri jipya (angalau herufi 6)',
          'portal.rspassph': 'Nenosiri jipya',
          'portal.rsbtn': 'Sasisha nenosiri',
          'portal.out': 'Toka',
          'portal.note': 'Akaunti, viwango vya ufikiaji na rasilimali zinahifadhiwa kwenye hifadhidata ya Supabase ya kwaya na zinalindwa na usalama wa ngazi ya safu upande wa seva.',
          'portal.profile': 'Profaili yangu',
          'portal.mres': 'Rasilimali za wanachama',
          'portal.lres': 'Rasilimali za viongozi',
          'portal.ares': 'Rasilimali za admin',
          'portal.adminlink': 'Fungua dashibodi ya admin \u2192 ili kuhariri maudhui ya tovuti.',
          'portal.manage': 'Simamia wanachama',
          'portal.addres': 'Ongeza rasilimali',
          'portal.title': 'Kichwa',
          'portal.body': 'Maudhui',
          'portal.bodyph': 'Andika maudhui...',
          'portal.shown': 'Ionwayo na',
          'portal.all': 'Wanachama wote',
          'portal.leaders': 'Viongozi pekee',
          'portal.admins': 'Admin pekee',
          'portal.addbtn': 'Ongeza rasilimali',
          'portal.aud': 'Maombi ya mahojiano',
          'portal.msg': 'Ujumbe wa wasiliano',
          'portal.empty': 'Hakuna chochote bado.',
          'portal.role.member': 'Mwanachama',
          'portal.role.leader': 'Kiongozi',
          'portal.role.section_leader': 'Kiongozi wa Sehemu',
          'portal.role.admin': 'Admin',
          'portal.you': '(wewe)',
          'portal.pend.title': 'Akaunti inasubiri kuidhinishwa',
          'portal.pend.sub': 'Admin lazima aidhinishe usajili wako kabla ya kutumia portal. Umejiunga na kiungo cha mwaliko? Hakikisha umejiandikisha kwa barua pepe ile ile iliyotumiwa mwaliko.',
          'portal.pend.rejected': 'Usajili wako haukuidhinishwa. Wasiliana na uongozi wa kwaya kama unadhani hii ni kosa.',
          'portal.invite.activating': 'Mwaliko umepatikana — tunawasha akaunti yako...',
          'portal.next': 'Tukio lijalo',
          'portal.events': 'Matukio yajayo',
          'portal.anno': 'Matangazo',
          'portal.noevents': 'Hakuna matukio yajayo bado — viongozi wataongeza hivi karibuni.',
          'portal.noanno': 'Hakuna matangazo bado.',
          'portal.rsvp': 'Uthibitisho wako',
          'portal.rsvp.attending': 'Nitakuwepo',
          'portal.rsvp.not_attending': 'Siwezi kufika',
          'portal.rsvp.maybe': 'Labda',
          'portal.rsvp.none': 'Haijajibiwa',
          'portal.rsvp.err': 'Imeshindikana kusasisha uthibitisho wako.',
          'portal.rsvp.mandatory': 'Mahudhurio yanatarajiwa',
          'portal.invite': 'Alika mwanachama',
          'portal.invite.email': 'Barua pepe ya mwanachama',
          'portal.invite.role': 'Kiwango cha ufikiaji',
          'portal.invite.btn': 'Unda kiungo cha mwaliko',
          'portal.invite.note': 'Shiriki kiungo hiki na mwanachama. Ataanza kupitia kiungo na kuamilishwa kiotomatiki baada ya kuthibitisha barua pepe yake.',
          'portal.invite.link': 'Kiungo cha mwaliko',
          'portal.invite.copy': 'Nakili',
          'portal.invite.copied': 'Imenakiliwa!',
          'portal.invite.err': 'Imeshindikana kuunda kiungo cha mwaliko.',
          'portal.pending': 'Usajili unaosubiri',
          'portal.pending.none': 'Hakuna usajili unaosubiri kuidhinishwa.',
          'portal.approve': 'Idhinisha',
          'portal.reject': 'Kataa',
          'portal.approved': 'Mwanachama amekubaliwa.',
          'portal.rejected': 'Mwanachama amekataliwa.',
          'portal.status.err': 'Imeshindikana kusasisha hali ya mwanachama.'
        }
      }
    };

    static lang = 'en';
    static scope = 'site';

    static saved() {
      try { return localStorage.getItem(LS_KEY) || 'en'; } catch (e) { return 'en'; }
    }

    static lookup(key) {
      const scopes = [I18n.scope, ...Object.keys(I18n.DICTS).filter(s => s !== I18n.scope)];
      for (const sc of scopes) {
        const d = I18n.DICTS[sc] || {};
        const k = d[I18n.lang] || {};
        if (Object.prototype.hasOwnProperty.call(k, key)) return k[key];
      }
      return undefined;
    }

    static t(key) {
      const v = I18n.lookup(key);
      return v != null ? v : key;
    }

    static apply() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (!('i18nOrig' in el.dataset)) el.dataset.i18nOrig = el.textContent;
        const v = I18n.lookup(el.dataset.i18n);
        el.textContent = v != null ? v : el.dataset.i18nOrig;
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        if (!('i18nPhOrig' in el.dataset)) el.dataset.i18nPhOrig = el.getAttribute('placeholder') || '';
        const v = I18n.lookup(el.dataset.i18nPh);
        el.setAttribute('placeholder', v != null ? v : el.dataset.i18nPhOrig);
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        if (!('i18nAriaOrig' in el.dataset)) el.dataset.i18nAriaOrig = el.getAttribute('aria-label') || '';
        const v = I18n.lookup(el.dataset.i18nAria);
        el.setAttribute('aria-label', v != null ? v : el.dataset.i18nAriaOrig);
      });
      document.documentElement.lang = I18n.lang;
    }

    static set(lang) {
      if (!I18n.DICTS[I18n.scope] || !I18n.DICTS[I18n.scope][lang]) return;
      I18n.lang = lang;
      try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* ignore */ }
      I18n.apply();
      document.querySelectorAll('.tblang button').forEach(b => {
        const on = b.dataset.lang === lang;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    static init(scope) {
      if (scope) I18n.scope = scope;
      I18n.lang = I18n.DICTS[I18n.scope] && I18n.DICTS[I18n.scope][I18n.saved()] ? I18n.saved() : 'en';
      I18n.apply();
    }
  }

  window.I18n = I18n;
})();
