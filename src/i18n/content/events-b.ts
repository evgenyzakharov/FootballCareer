import type { Content } from '../types'

/** Медиа и жизнь вне поля. */
export const EVENTS_B: Content = {
  // ─── press_criticism ──────────────────────────────────────────────────────
  'ev.press_criticism.title': { ru: 'Вопрос на пресс-конференции', en: 'A question at the press conference' },
  'ev.press_criticism.body': {
    ru: 'Журналист прямо спрашивает, согласны ли вы с решениями {manager}. Микрофон включён.',
    en: 'A reporter asks straight out whether you agree with {manager}. The microphone is live.',
  },
  'ev.press_criticism.opt.diplomatic': { ru: 'Ответить дипломатично', en: 'Answer diplomatically' },
  'ev.press_criticism.opt.blunt': { ru: 'Сказать как есть', en: 'Say what you think' },
  'ev.press_criticism.opt.silent': { ru: 'Отказаться отвечать', en: 'Refuse to answer' },
  'ev.press_criticism.res.diplomatic': { ru: 'Ответ разобрали как образцовый. Никто не обижен.', en: 'The answer was called a masterclass. Nobody was offended.' },
  'ev.press_criticism.res.blunt_hero': { ru: 'Трибуны согласились с вами. Тренер — нет.', en: 'The stands agreed with you. The manager did not.' },
  'ev.press_criticism.hl.blunt_hero': { ru: 'Публично поспорил с тренером', en: 'Publicly at odds with the manager' },
  'ev.press_criticism.res.blunt_exiled': { ru: 'Тренер вычеркнул вас из планов в тот же вечер.', en: 'The manager wrote you out of his plans that same evening.' },
  'ev.press_criticism.hl.blunt_exiled': { ru: 'Конфликт с тренером стоил места в составе', en: 'Feud with the manager costs a place in the side' },
  'ev.press_criticism.res.silent': { ru: 'Молчание тренер оценил, пресса — нет.', en: 'The manager appreciated the silence; the press did not.' },

  // ─── relative_post ────────────────────────────────────────────────────────
  'ev.relative_post.title': { ru: 'Родня в соцсетях', en: 'Family on social media' },
  'ev.relative_post.body': {
    ru: '{relative} публично разнёс клуб и тренера. Скриншот уже везде.',
    en: '{relative} publicly tore into the club and the manager. The screenshot is everywhere.',
  },
  'ev.relative_post.opt.support': { ru: 'Поддержать родню', en: 'Back your family' },
  'ev.relative_post.opt.disown': { ru: 'Публично не согласиться', en: 'Publicly disagree' },
  'ev.relative_post.opt.stay_out': { ru: 'Не комментировать', en: 'No comment' },
  'ev.relative_post.res.support': { ru: 'Семья важнее. Трибуны с этим не согласились.', en: 'Family first. The stands disagreed.' },
  'ev.relative_post.res.disown': { ru: 'Клуб доволен, дома вас не поняли.', en: 'The club is pleased; at home they do not understand.' },
  'ev.relative_post.res.stay_out': { ru: 'Вы промолчали, и история потухла сама.', en: 'You said nothing and the story burned out.' },

  // ─── giant_tattoo ─────────────────────────────────────────────────────────
  'ev.giant_tattoo.title': { ru: 'Огромная татуировка', en: 'A giant tattoo' },
  'ev.giant_tattoo.body': {
    ru: 'Известная студия предлагает набить орла во всю грудь и заплатить за это как за рекламу.',
    en: 'A famous studio offers to ink an eagle across your chest and pay you like an advertiser.',
  },
  'ev.giant_tattoo.opt.do_it': { ru: 'Согласиться', en: 'Do it' },
  'ev.giant_tattoo.opt.refuse': { ru: 'Отказаться', en: 'Refuse' },
  'ev.giant_tattoo.res.refuse': { ru: 'Вы остались без орла и без гонорара.', en: 'No eagle, no fee.' },
  'ev.giant_tattoo.res.iconic': { ru: 'Орёл стал вашим символом. Его печатают на баннерах.', en: 'The eagle became your symbol. It is on the banners now.' },
  'ev.giant_tattoo.hl.iconic': { ru: 'Татуировка стала визитной карточкой', en: 'The tattoo becomes a trademark' },
  'ev.giant_tattoo.res.mocked': { ru: 'Над орлом смеялись две недели во всех передачах.', en: 'The eagle was mocked on every show for two weeks.' },
  'ev.giant_tattoo.hl.mocked': { ru: 'Татуировку разобрали на мемы', en: 'The tattoo becomes a meme' },

  // ─── documentary ──────────────────────────────────────────────────────────
  'ev.documentary.title': { ru: 'Документальный фильм', en: 'A documentary' },
  'ev.documentary.body': {
    ru: 'Студия хочет снять о вас сериал. Вопрос в том, куда пустить камеры.',
    en: 'A studio wants to make a series about you. The question is where the cameras go.',
  },
  'ev.documentary.opt.full_access': { ru: 'Полный доступ', en: 'Full access' },
  'ev.documentary.opt.limited': { ru: 'Только тренировки', en: 'Training only' },
  'ev.documentary.opt.refuse': { ru: 'Отказаться', en: 'Refuse' },
  'ev.documentary.res.hit': { ru: 'Сериал взлетел. Вас узнают там, где не знают футбола.', en: 'The series took off. People know you where football does not reach.' },
  'ev.documentary.hl.hit': { ru: 'Фильм о карьере стал хитом', en: 'The career documentary is a hit' },
  'ev.documentary.res.leak': { ru: 'В финальный монтаж попало то, что должно было остаться в раздевалке.', en: 'The final cut kept what should have stayed in the dressing room.' },
  'ev.documentary.hl.leak': { ru: 'Раздевалка попала в кадр', en: 'The dressing room made the final cut' },
  'ev.documentary.res.limited': { ru: 'Аккуратный фильм, аккуратный гонорар.', en: 'A careful film and a careful fee.' },
  'ev.documentary.res.refuse': { ru: 'Съёмки прошли без вас.', en: 'The film was made without you.' },

  // ─── fan_backlash ─────────────────────────────────────────────────────────
  'ev.fan_backlash.title': { ru: 'Трибуны против вас', en: 'The stands turn' },
  'ev.fan_backlash.body': {
    ru: 'Фанаты {club} вывесили баннер с вашей фамилией. Не в вашу поддержку.',
    en: '{club} supporters put up a banner with your name on it. Not in support.',
  },
  'ev.fan_backlash.opt.meet_ultras': { ru: 'Пойти на разговор', en: 'Go and talk to them' },
  'ev.fan_backlash.opt.answer_pitch': { ru: 'Отвечать на поле', en: 'Answer on the pitch' },
  'ev.fan_backlash.opt.ignore': { ru: 'Не замечать', en: 'Ignore it' },
  'ev.fan_backlash.res.peace': { ru: 'Разговор вышел жёстким и честным. Баннер сняли.', en: 'The talk was hard and honest. The banner came down.' },
  'ev.fan_backlash.hl.peace': { ru: 'Поговорил с трибуной напрямую', en: 'Faced the ultras head-on' },
  'ev.fan_backlash.res.ambush': { ru: 'Разговор превратился в травлю, и это стало новостью.', en: 'The meeting turned into an ambush, and it made the news.' },
  'ev.fan_backlash.hl.ambush': { ru: 'Встреча с фанатами пошла не по плану', en: 'The meeting with the ultras went badly' },
  'ev.fan_backlash.res.answer_pitch': { ru: 'Ответ вышел не сразу, но трибуны его признали.', en: 'The answer took time, but the stands accepted it.' },
  'ev.fan_backlash.res.ignore': { ru: 'Баннеры остались, настроение испортилось.', en: 'The banners stayed and the mood soured.' },

  // ─── boot_sponsor ─────────────────────────────────────────────────────────
  'ev.boot_sponsor.title': { ru: 'Контракт на бутсы', en: 'A boot deal' },
  'ev.boot_sponsor.body': {
    ru: 'Производитель предлагает {amount} за сезон. Агент считает, что можно выжать больше.',
    en: 'A brand offers {amount} for the season. Your agent thinks there is more on the table.',
  },
  'ev.boot_sponsor.opt.sign': { ru: 'Подписать', en: 'Sign it' },
  'ev.boot_sponsor.opt.hold_out': { ru: 'Торговаться', en: 'Hold out' },
  'ev.boot_sponsor.res.sign': { ru: 'Контракт подписан, деньги на счету.', en: 'Signed, and the money is in.' },
  'ev.boot_sponsor.res.bigger': { ru: 'Торг сработал: сумма выросла больше чем вдвое.', en: 'Holding out worked: the fee more than doubled.' },
  'ev.boot_sponsor.hl.bigger': { ru: 'Крупный контракт с производителем', en: 'A major brand deal' },
  'ev.boot_sponsor.res.nothing': { ru: 'Бренд ушёл к другому. Осталось только объяснять агенту.', en: 'The brand went elsewhere. Now explain it to your agent.' },

  // ─── paparazzi ────────────────────────────────────────────────────────────
  'ev.paparazzi.title': { ru: 'Ночные фотографии', en: 'Night-time photographs' },
  'ev.paparazzi.body': {
    ru: 'Снимки из клуба в три ночи разошлись по таблоидам. Матч был через два дня.',
    en: 'Shots from a club at three in the morning are all over the tabloids. There was a game two days later.',
  },
  'ev.paparazzi.opt.apologise': { ru: 'Извиниться публично', en: 'Apologise publicly' },
  'ev.paparazzi.opt.joke': { ru: 'Отшутиться', en: 'Laugh it off' },
  'ev.paparazzi.opt.lawyers': { ru: 'Подключить юристов', en: 'Send in the lawyers' },
  'ev.paparazzi.res.apologise': { ru: 'Извинения приняли. Тренер отдельно оценил.', en: 'The apology was accepted. The manager appreciated it separately.' },
  'ev.paparazzi.res.joke': { ru: 'Шутку разобрали на цитаты. В клубе не смеялись.', en: 'The joke went viral. Nobody at the club laughed.' },
  'ev.paparazzi.res.lawyers': { ru: 'Фото убрали. Журналисты этого не забудут.', en: 'The photos came down. The press will not forget.' },

  // ─── hot_take_podcast ─────────────────────────────────────────────────────
  'ev.hot_take_podcast.title': { ru: 'Приглашение на подкаст', en: 'A podcast invitation' },
  'ev.hot_take_podcast.body': {
    ru: 'Популярный подкаст зовёт на живой разговор без согласований. Формат такой, что за язык никто не подержит.',
    en: 'A popular podcast wants an unscripted conversation. In that format nobody will hold your tongue for you.',
  },
  'ev.hot_take_podcast.opt.go_on': { ru: 'Пойти', en: 'Go on it' },
  'ev.hot_take_podcast.opt.decline': { ru: 'Отказаться', en: 'Decline' },
  'ev.hot_take_podcast.res.decline': { ru: 'Вы отказались и ничего не потеряли.', en: 'You declined and lost nothing.' },
  'ev.hot_take_podcast.res.charming': { ru: 'Разговор вышел живым, и вас разобрали на добрые цитаты.', en: 'The conversation was warm and the quotes were kind.' },
  'ev.hot_take_podcast.res.clip': { ru: 'Одну фразу вырвали из контекста и крутили неделю.', en: 'One line was pulled out of context and played for a week.' },
  'ev.hot_take_podcast.hl.clip': { ru: 'Фраза из подкаста разошлась по всем экранам', en: 'A podcast line goes everywhere' },

  // ─── press_boycott ────────────────────────────────────────────────────────
  'ev.press_boycott.title': { ru: 'Пресса объявила бойкот', en: 'The press declares a boycott' },
  'ev.press_boycott.body': {
    ru: 'После той истории вас перестали цитировать по-хорошему. Можно завести свой канал, можно мириться.',
    en: 'After that story nobody quotes you kindly. You can start your own channel, or make peace.',
  },
  'ev.press_boycott.opt.own_channel': { ru: 'Свой канал', en: 'Your own channel' },
  'ev.press_boycott.opt.make_peace': { ru: 'Мириться', en: 'Make peace' },
  'ev.press_boycott.res.own_channel': { ru: 'Теперь вы говорите напрямую. Посредники обиделись окончательно.', en: 'Now you speak directly. The middlemen took it badly.' },
  'ev.press_boycott.res.make_peace': { ru: 'Ужин, интервью, мир. Дорого, но работает.', en: 'A dinner, an interview, peace. Expensive, but it works.' },

  // ─── charity_visit ────────────────────────────────────────────────────────
  'ev.charity_visit.title': { ru: 'Приглашение в детскую больницу', en: 'An invitation to a children’s hospital' },
  'ev.charity_visit.body': {
    ru: 'Фонд просит приехать лично. Можно приехать, можно просто перевести деньги.',
    en: 'A foundation asks you to come in person. You can go, or you can just transfer money.',
  },
  'ev.charity_visit.opt.go': { ru: 'Приехать', en: 'Go there' },
  'ev.charity_visit.opt.send_money': { ru: 'Перевести деньги', en: 'Send money' },
  'ev.charity_visit.opt.skip': { ru: 'Не сейчас', en: 'Not now' },
  'ev.charity_visit.res.go': { ru: 'Полдня без камер, и это единственное, что запомнилось за месяц.', en: 'Half a day without cameras — the only thing you remember from that month.' },
  'ev.charity_visit.res.send_money': { ru: 'Деньги пришли, вас там не было.', en: 'The money arrived; you did not.' },
  'ev.charity_visit.res.skip': { ru: 'Вы не поехали, и об этом написали.', en: 'You did not go, and it was written about.' },

  // ─── finish_school ────────────────────────────────────────────────────────
  'ev.finish_school.title': { ru: 'Доучиться или нет', en: 'Finish school or not' },
  'ev.finish_school.body': {
    ru: 'Экзамены совпадают с началом сезона. Можно закрыть аттестат, можно бросить всё в футбол.',
    en: 'The exams collide with the start of the season. Finish the diploma, or put everything into football.',
  },
  'ev.finish_school.opt.study': { ru: 'Закончить учёбу', en: 'Finish school' },
  'ev.finish_school.opt.football_only': { ru: 'Только футбол', en: 'Football only' },
  'ev.finish_school.res.study': { ru: 'Диплом получен. Голова работает по-другому.', en: 'Diploma done. Your head works differently now.' },
  'ev.finish_school.res.football_only': { ru: 'Всё в футбол. Об этом вы ещё подумаете — лет через восемь.', en: 'Everything into football. You will think about it again — in about eight years.' },

  // ─── after_football_worry ─────────────────────────────────────────────────
  'ev.after_football_worry.title': { ru: 'А что потом', en: 'And what comes after' },
  'ev.after_football_worry.body': {
    ru: 'Впервые всерьёз задумались, чем заниматься после карьеры. Время ещё есть, но уже не бесконечно.',
    en: 'For the first time you seriously think about life after football. There is time, but not endless time.',
  },
  'ev.after_football_worry.opt.coaching_badges': { ru: 'Тренерские курсы', en: 'Coaching badges' },
  'ev.after_football_worry.opt.business_course': { ru: 'Бизнес-программа', en: 'A business programme' },
  'ev.after_football_worry.opt.later': { ru: 'Подумать позже', en: 'Think about it later' },
  'ev.after_football_worry.res.coaching_badges': { ru: 'Вы начали смотреть на футбол глазами тренера — и это помогает уже сейчас.', en: 'You started seeing football through a coach’s eyes — and it helps already.' },
  'ev.after_football_worry.res.business_course': { ru: 'Первые вложения окупились. Футбол от этого не выиграл.', en: 'The first investments paid off. Football did not benefit.' },
  'ev.after_football_worry.res.later': { ru: 'Вопрос отложен. Он вернётся.', en: 'The question is postponed. It will come back.' },

  // ─── tax_trouble ──────────────────────────────────────────────────────────
  'ev.tax_trouble.title': { ru: 'Налоговая проверка', en: 'A tax investigation' },
  'ev.tax_trouble.body': {
    ru: 'Налоговая {country} прислала требование по правам на изображение. Суммы серьёзные.',
    en: 'The tax authority in {country} has come after your image rights. The numbers are serious.',
  },
  'ev.tax_trouble.opt.settle': { ru: 'Заплатить и закрыть', en: 'Settle and close it' },
  'ev.tax_trouble.opt.fight': { ru: 'Судиться', en: 'Fight it' },
  'ev.tax_trouble.opt.leave_country': { ru: 'Уехать из страны', en: 'Leave the country' },
  'ev.tax_trouble.res.settle': { ru: 'Заплатили и забыли. Дорого, но тихо.', en: 'Paid and forgotten. Expensive, but quiet.' },
  'ev.tax_trouble.res.cleared': { ru: 'Суд встал на вашу сторону.', en: 'The court sided with you.' },
  'ev.tax_trouble.hl.cleared': { ru: 'Суд снял налоговые претензии', en: 'Court clears the tax claims' },
  'ev.tax_trouble.res.convicted': { ru: 'Проиграли по всем пунктам. Половина заработанного ушла.', en: 'Lost on every count. Half of what you earned is gone.' },
  'ev.tax_trouble.hl.convicted': { ru: 'Проиграл налоговый спор', en: 'Loses the tax case' },
  'ev.tax_trouble.res.leave_country': { ru: 'Вы решили, что в этой стране больше играть не будете.', en: 'You decided you would not be playing in this country any more.' },

  // ─── family_pressure ──────────────────────────────────────────────────────
  'ev.family_pressure.title': { ru: 'Разговор с семьёй', en: 'A conversation with family' },
  'ev.family_pressure.body': {
    ru: 'Дома просят вернуться в {home}: без вас там тяжело.',
    en: 'They are asking you to come back to {home}: it is hard there without you.',
  },
  'ev.family_pressure.opt.bring_them': { ru: 'Перевезти семью к себе', en: 'Bring them over' },
  'ev.family_pressure.opt.promise_return': { ru: 'Пообещать вернуться', en: 'Promise to come back' },
  'ev.family_pressure.opt.refuse': { ru: 'Отказать', en: 'Say no' },
  'ev.family_pressure.res.bring_them': { ru: 'Все рядом. Это видно и на поле.', en: 'Everyone is close now. It shows on the pitch too.' },
  'ev.family_pressure.res.promise_return': { ru: 'Вы дали слово вернуться. Слово придётся держать.', en: 'You gave your word to come back. You will have to keep it.' },
  'ev.family_pressure.res.refuse': { ru: 'Разговор закончился тяжело. Вы ушли в футбол глубже.', en: 'The conversation ended badly. You went deeper into football.' },

  // ─── return_home_promise ──────────────────────────────────────────────────
  'ev.return_home_promise.title': { ru: 'Обещание нужно исполнять', en: 'A promise comes due' },
  'ev.return_home_promise.body': {
    ru: 'Дома напомнили про обещание вернуться в {home}. Клубы оттуда действительно интересуются.',
    en: 'Home reminded you about the promise to return to {home}. Clubs there really are interested.',
  },
  'ev.return_home_promise.opt.keep_promise': { ru: 'Держать слово', en: 'Keep your word' },
  'ev.return_home_promise.opt.break_promise': { ru: 'Остаться', en: 'Stay where you are' },
  'ev.return_home_promise.res.keep_promise': { ru: 'Вы начали искать вариант домой всерьёз.', en: 'You started looking for a way home in earnest.' },
  'ev.return_home_promise.res.break_promise': { ru: 'Обещание осталось невыполненным, и это давит.', en: 'The promise stayed unkept, and it weighs on you.' },

  // ─── gambling ─────────────────────────────────────────────────────────────
  'ev.gambling.title': { ru: 'Игра по-крупному', en: 'Playing for real money' },
  'ev.gambling.body': {
    ru: 'Партнёры затянули в покер на суммы, от которых у обычного человека сводит челюсть.',
    en: 'Teammates pulled you into a poker game with numbers that would freeze a normal person.',
  },
  'ev.gambling.opt.in': { ru: 'Играть', en: 'Play' },
  'ev.gambling.opt.out': { ru: 'Выйти из игры', en: 'Walk away' },
  'ev.gambling.res.out': { ru: 'Вы ушли до раздачи. Слегка обидно и абсолютно правильно.', en: 'You left before the deal. Slightly annoying and entirely right.' },
  'ev.gambling.res.won': { ru: 'Ночь принесла больше, чем месяц по контракту.', en: 'One night brought in more than a month of wages.' },
  'ev.gambling.res.lost': { ru: 'Проигрыш пришлось закрывать из своих. Голова осталась там.', en: 'You had to cover the loss yourself. Your head stayed at that table.' },
  'ev.gambling.hl.lost': { ru: 'Крупный проигрыш за карточным столом', en: 'A heavy loss at the card table' },

  // ─── debt_pressure ────────────────────────────────────────────────────────
  'ev.debt_pressure.title': { ru: 'Долг требуют вернуть', en: 'The debt is called in' },
  'ev.debt_pressure.body': {
    ru: 'Люди, которым вы должны, перестали быть вежливыми.',
    en: 'The people you owe have stopped being polite.',
  },
  'ev.debt_pressure.opt.sell_assets': { ru: 'Продать имущество', en: 'Sell assets' },
  'ev.debt_pressure.opt.borrow': { ru: 'Взять в долг ещё', en: 'Borrow more' },
  'ev.debt_pressure.opt.go_public': { ru: 'Рассказать всё самому', en: 'Tell the story yourself' },
  'ev.debt_pressure.res.sell_assets': { ru: 'Долг закрыт своими деньгами. Неприятно и чисто.', en: 'The debt is closed with your own money. Unpleasant and clean.' },
  'ev.debt_pressure.res.borrow': { ru: 'Вы закрыли одну дыру, открыв другую. К вам ещё придут.', en: 'You closed one hole by opening another. They will be back.' },
  'ev.debt_pressure.res.go_public': { ru: 'Интервью на своих условиях выбило почву у шантажа.', en: 'An interview on your terms pulled the ground from under the blackmail.' },
  'ev.debt_pressure.hl.go_public': { ru: 'Сам рассказал о долгах', en: 'Tells the story of the debts himself' },

  // ─── property_investment ──────────────────────────────────────────────────
  'ev.property_investment.title': { ru: 'Вложить или держать', en: 'Invest or hold' },
  'ev.property_investment.body': {
    ru: 'Знакомый предлагает войти в стройку. Деньги вернутся через несколько сезонов — или не вернутся.',
    en: 'A contact offers you a stake in a development. The money comes back in a few seasons — or it does not.',
  },
  'ev.property_investment.opt.invest': { ru: 'Вложиться', en: 'Invest' },
  'ev.property_investment.opt.keep_cash': { ru: 'Держать деньги', en: 'Keep the cash' },
  'ev.property_investment.res.invest': { ru: 'Деньги ушли в проект. Теперь остаётся ждать.', en: 'The money went into the project. Now you wait.' },
  'ev.property_investment.res.keep_cash': { ru: 'Вы оставили деньги при себе.', en: 'You kept the money where it was.' },

  // ─── investment_matures ───────────────────────────────────────────────────
  'ev.investment_matures.title': { ru: 'Вложение закрылось', en: 'The investment matures' },
  'ev.investment_matures.body': {
    ru: 'Пришли итоги по проекту, в который вы заходили несколько лет назад.',
    en: 'The results came in on the project you joined a few years ago.',
  },
  'ev.investment_matures.opt.ok': { ru: 'Посмотреть цифры', en: 'Look at the numbers' },
  'ev.investment_matures.res.profit': { ru: 'Проект вышел удачным: вернулось почти вдвое.', en: 'The project worked out: nearly double came back.' },
  'ev.investment_matures.res.loss': { ru: 'Проект сгорел. Денег нет, опыт есть.', en: 'The project burned. No money, plenty of experience.' },

  // ─── child_born ───────────────────────────────────────────────────────────
  'ev.child_born.title': { ru: 'В семье родился ребёнок', en: 'A child is born' },
  'ev.child_born.body': {
    ru: 'Всё поменялось за одну ночь. Осталось решить, как совмещать это с сезоном.',
    en: 'Everything changed in one night. Now you have to fit it around a season.',
  },
  'ev.child_born.opt.full_time': { ru: 'Быть дома по-настоящему', en: 'Really be at home' },
  'ev.child_born.opt.balance': { ru: 'Искать баланс', en: 'Find a balance' },
  'ev.child_born.res.full_time': { ru: 'Вы почти не спите и никогда не были так спокойны.', en: 'You barely sleep and have never been this calm.' },
  'ev.child_born.hl.full_time': { ru: 'Стал отцом', en: 'Becomes a father' },
  'ev.child_born.res.balance': { ru: 'Получается неидеально, но получается.', en: 'It is not perfect, but it works.' },

  // ─── foundation ───────────────────────────────────────────────────────────
  'ev.foundation.title': { ru: 'Свой фонд', en: 'Your own foundation' },
  'ev.foundation.body': {
    ru: 'У вас достаточно денег и известности, чтобы сделать что-то заметное за пределами футбола.',
    en: 'You have enough money and enough fame to do something visible outside football.',
  },
  'ev.foundation.opt.found': { ru: 'Основать фонд', en: 'Found it' },
  'ev.foundation.opt.skip': { ru: 'Не сейчас', en: 'Not now' },
  'ev.foundation.res.found': { ru: 'Фонд заработал, и это оказалось важнее половины ваших трофеев.', en: 'The foundation is running, and it matters more than half your trophies.' },
  'ev.foundation.hl.found': { ru: 'Открыл собственный фонд', en: 'Launches his own foundation' },
  'ev.foundation.res.skip': { ru: 'Отложили на потом.', en: 'Left for later.' },

  // ─── agent_scam ───────────────────────────────────────────────────────────
  'ev.agent_scam.title': { ru: 'Странные цифры в отчётах', en: 'Strange numbers in the statements' },
  'ev.agent_scam.body': {
    ru: 'Бухгалтерия агента не сходится. Можно поверить объяснениям, можно позвать аудитора.',
    en: 'Your agent’s books do not add up. You can accept the explanation, or call an auditor.',
  },
  'ev.agent_scam.opt.trust': { ru: 'Поверить', en: 'Take his word' },
  'ev.agent_scam.opt.audit': { ru: 'Позвать аудитора', en: 'Call an auditor' },
  'ev.agent_scam.res.audit': { ru: 'Аудит нашёл мелочи. Агент обиделся, деньги целы.', en: 'The audit found small stuff. The agent took offence; the money is safe.' },
  'ev.agent_scam.res.fine': { ru: 'Всё оказалось чисто, и агент нашёл вам ещё денег.', en: 'It was all clean, and the agent found you more money.' },
  'ev.agent_scam.res.robbed': { ru: 'Половина заработанного ушла в никуда вместе с доверием.', en: 'Half of what you earned vanished, and your trust with it.' },
  'ev.agent_scam.hl.robbed': { ru: 'Агент вывел половину заработанного', en: 'Agent siphons off half the earnings' },
}
