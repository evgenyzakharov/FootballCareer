import type { Content } from '../types'

/** Вратарские ситуации: своя рамка, своя конкуренция, свои ошибки. */
export const EVENTS_GK: Content = {
  // ─── gk_last_line ─────────────────────────────────────────────────────────
  'ev.gk_last_line.title': { ru: 'Последний рубеж', en: 'The last line' },
  'ev.gk_last_line.body': {
    ru: 'Последняя минута решающего для {club} матча. Соперник выходит один на один, между ним и голом только вы.',
    en: 'The last minute of the match that decides {club}’s season. A striker is through on goal with only you in the way.',
  },
  'ev.gk_last_line.opt.rush': { ru: 'Выходить в ноги', en: 'Rush out at his feet' },
  'ev.gk_last_line.opt.hold_line': { ru: 'Остаться в воротах', en: 'Stay on your line' },
  'ev.gk_last_line.opt.narrow': { ru: 'Закрыть угол и ждать удара', en: 'Narrow the angle and wait' },
  'ev.gk_last_line.res.smothered': { ru: 'Вы накрыли мяч в ногах. Стадион выдохнул только через минуту.', en: 'You smothered it at his feet. The stadium did not breathe for a minute.' },
  'ev.gk_last_line.hl.smothered': { ru: 'Спас команду в решающем матче', en: 'Saves the season with one stop' },
  'ev.gk_last_line.res.beaten': { ru: 'Он перебросил вас в тот момент, когда вы уже лежали.', en: 'He lifted it over you while you were already down.' },
  'ev.gk_last_line.hl.beaten': { ru: 'Вышел из ворот и пропустил', en: 'Rushed out and was beaten' },
  'ev.gk_last_line.res.saved': { ru: 'Угол был закрыт, удар пришёлся в вас.', en: 'The angle was closed and the shot came straight at you.' },
  'ev.gk_last_line.hl.saved': { ru: 'Отразил выход один на один', en: 'Saves the one-on-one' },
  'ev.gk_last_line.res.conceded': { ru: 'Он подождал вас и покатил мимо. Ничего сделать было нельзя.', en: 'He waited for you and rolled it past. Nothing to be done.' },
  'ev.gk_last_line.res.hold_line': { ru: 'Вы не дёрнулись и заставили его бить издали. Правильно, но без овации.', en: 'You did not move and made him shoot early. Correct, and nobody applauded.' },

  // ─── gk_shootout_save ─────────────────────────────────────────────────────
  'ev.gk_shootout_save.title': { ru: 'Серия пенальти: ваша сторона', en: 'Shoot-out: your end' },
  'ev.gk_shootout_save.body': {
    ru: 'Одиннадцать метров, и на этот раз работа ваша. Можно читать по опорной ноге, можно прыгать заранее, а можно поиграть в психологию.',
    en: 'Eleven metres, and this time the work is yours. Read the standing foot, dive early, or play the mind game.',
  },
  'ev.gk_shootout_save.opt.read': { ru: 'Читать по опорной ноге', en: 'Read the standing foot' },
  'ev.gk_shootout_save.opt.guess': { ru: 'Прыгать заранее', en: 'Commit early' },
  'ev.gk_shootout_save.opt.mind_games': { ru: 'Тянуть время и давить', en: 'Slow it down and get in his head' },
  'ev.gk_shootout_save.res.read_it': { ru: 'Вы дождались и достали мяч в углу.', en: 'You waited and got a hand to it in the corner.' },
  'ev.gk_shootout_save.hl.read_it': { ru: 'Взял пенальти в серии', en: 'Saves a penalty in the shoot-out' },
  'ev.gk_shootout_save.res.no_luck': { ru: 'Угадали направление, но мяч ушёл слишком точно.', en: 'You guessed right, but it was too well placed.' },
  'ev.gk_shootout_save.res.guessed_right': { ru: 'Вы улетели в угол до удара и достали мяч. Такое показывают годами.', en: 'You were in the corner before he hit it. They will show that for years.' },
  'ev.gk_shootout_save.hl.guessed_right': { ru: 'Вытащил серию пенальти', en: 'Wins the shoot-out on his own' },
  'ev.gk_shootout_save.res.guessed_wrong': { ru: 'Вы прыгнули в один угол, мяч — в другой.', en: 'You went one way, the ball went the other.' },
  'ev.gk_shootout_save.hl.guessed_wrong': { ru: 'Прыгнул раньше удара и пропустил', en: 'Dives early and is punished' },
  'ev.gk_shootout_save.res.rattled_them': { ru: 'Пока вы тянули время, он передумал бить в тот угол.', en: 'While you stalled, he changed his mind about the corner.' },
  'ev.gk_shootout_save.hl.rattled_them': { ru: 'Переиграл соперника ещё до удара', en: 'Wins the duel before the kick' },
  'ev.gk_shootout_save.res.booked': { ru: 'Судья наказал за задержку, и трибуны согласились с судьёй.', en: 'The referee booked you for stalling, and the crowd agreed with him.' },

  // ─── gk_howler ────────────────────────────────────────────────────────────
  'ev.gk_howler.title': { ru: 'Ваша ошибка, ваш гол', en: 'Your mistake, your goal' },
  'ev.gk_howler.body': {
    ru: 'Мяч выскользнул из рук и оказался в сетке. Повтор крутят со всех камер, и оправданий там не видно.',
    en: 'The ball slipped through your hands and into the net. The replay is running from every angle and it offers no excuses.',
  },
  'ev.gk_howler.opt.own_it': { ru: 'Признать вину публично', en: 'Own it publicly' },
  'ev.gk_howler.opt.blame_defence': { ru: 'Сказать, что подвела защита', en: 'Say the defence let you down' },
  'ev.gk_howler.opt.silent': { ru: 'Ничего не комментировать', en: 'Say nothing' },
  'ev.gk_howler.res.own_it': { ru: 'Вы вышли и сказали, что это ваш гол. Команда это оценила, вы — нет.', en: 'You said it was your goal and nobody else’s. The squad respected it; you did not enjoy it.' },
  'ev.gk_howler.res.blame_stuck': { ru: 'Версия про защиту в целом прижилась. Защитники другого мнения.', en: 'The defence version mostly stuck. The defenders disagree.' },
  'ev.gk_howler.res.blame_backfired': { ru: 'Повтор посмотрели все, и виноватым остались вы один — теперь ещё и в раздевалке.', en: 'Everyone watched the replay, and you were the only one at fault — now in the dressing room too.' },
  'ev.gk_howler.hl.blame_backfired': { ru: 'Свалил свою ошибку на защиту', en: 'Blames the defence for his own error' },
  'ev.gk_howler.res.silent': { ru: 'Молчание прочитали как высокомерие, зато голова осталась ясной.', en: 'The silence read as arrogance, but your head stayed clear.' },

  // ─── gk_number_one ────────────────────────────────────────────────────────
  'ev.gk_number_one.title': { ru: 'Кто первый номер', en: 'Who is number one' },
  'ev.gk_number_one.body': {
    ru: 'В {club} два вратаря, а место одно: у голкипера ротации не бывает. Тренер объявит выбор перед первым туром.',
    en: '{club} have two keepers and one shirt: goalkeepers do not get rotated. The manager names his choice before the opener.',
  },
  'ev.gk_number_one.opt.duel': { ru: 'Выигрывать на тренировках', en: 'Win it in training' },
  'ev.gk_number_one.opt.guarantee': { ru: 'Требовать гарантий', en: 'Demand guarantees' },
  'ev.gk_number_one.opt.ask_loan': { ru: 'Просить аренду за игрой', en: 'Ask for a loan to play' },
  'ev.gk_number_one.res.won_gloves': { ru: 'Перчатки ваши. Второй вратарь весь сезон просидит на скамейке.', en: 'The gloves are yours. The other keeper will watch the whole season.' },
  'ev.gk_number_one.hl.won_gloves': { ru: 'Выиграл конкуренцию за место в рамке', en: 'Wins the battle for the gloves' },
  'ev.gk_number_one.res.lost_gloves': { ru: 'Выбрали не вас. Для вратаря это не ротация, а год на скамейке.', en: 'He picked the other one. For a keeper that is not rotation, it is a year on the bench.' },
  'ev.gk_number_one.hl.lost_gloves': { ru: 'Потерял место в рамке', en: 'Loses the gloves' },
  'ev.gk_number_one.res.guarantee': { ru: 'Гарантии вы получили, а вместе с ними — репутацию человека, который их требует.', en: 'You got your guarantees, and a reputation as someone who demands them.' },
  'ev.gk_number_one.res.ask_loan': { ru: 'Вы сказали, что готовы уехать за игровым временем.', en: 'You said you would leave for minutes.' },

  // ─── gk_sweeper_style ─────────────────────────────────────────────────────
  'ev.gk_sweeper_style.title': { ru: 'Играть в поле', en: 'Play as an outfielder' },
  'ev.gk_sweeper_style.body': {
    ru: 'Тренер требует высокой позиции и разыгрывать мяч коротко под прессингом. Ошибка в такой передаче — гол.',
    en: 'The manager wants you high up the pitch, playing short out of the back under pressure. One misplaced pass is a goal.',
  },
  'ev.gk_sweeper_style.opt.learn': { ru: 'Учиться играть коротко', en: 'Learn to play short' },
  'ev.gk_sweeper_style.opt.hybrid': { ru: 'Коротко, но без фанатизма', en: 'Short, but without heroics' },
  'ev.gk_sweeper_style.opt.refuse': { ru: 'Выбивать и не рисковать', en: 'Kick it long and take no risks' },
  'ev.gk_sweeper_style.res.learned': { ru: 'Пас с ноги стал вашим оружием, и тренер это заметил.', en: 'Your distribution became a weapon, and the manager noticed.' },
  'ev.gk_sweeper_style.res.cost_a_goal': { ru: 'Одна передача — и гол в свои. Учиться придётся дальше, но дороже.', en: 'One pass, one goal against. You will keep learning, at a higher price.' },
  'ev.gk_sweeper_style.hl.cost_a_goal': { ru: 'Ошибка в передаче стоила гола', en: 'A misplaced pass costs a goal' },
  'ev.gk_sweeper_style.res.hybrid': { ru: 'Разумный компромисс: коротко, когда открыто, длинно, когда нет.', en: 'A sensible compromise: short when it is open, long when it is not.' },
  'ev.gk_sweeper_style.res.refuse': { ru: 'Вы играете как умеете. Тренер играет с другим вратарём в голове.', en: 'You play the way you know. The manager pictures a different keeper.' },

  // ─── gk_clean_sheet_run ───────────────────────────────────────────────────
  'ev.gk_clean_sheet_run.title': { ru: 'Серия на ноль', en: 'A clean-sheet run' },
  'ev.gk_clean_sheet_run.body': {
    ru: 'Сухих матчей уже {count}, и пресса начала считать минуты до рекорда. Вопрос, думать об этом или нет.',
    en: '{count} clean sheets already, and the press has started counting minutes to the record. The question is whether to think about it.',
  },
  'ev.gk_clean_sheet_run.opt.chase': { ru: 'Идти за рекордом', en: 'Chase the record' },
  'ev.gk_clean_sheet_run.opt.ignore': { ru: 'Не считать', en: 'Stop counting' },
  'ev.gk_clean_sheet_run.res.record': { ru: 'Рекорд взят. Про вас говорят даже там, где не смотрят футбол.', en: 'The record is yours. They talk about you where football is not watched.' },
  'ev.gk_clean_sheet_run.hl.record': { ru: 'Установил рекорд по сухим матчам', en: 'Sets a clean-sheet record' },
  'ev.gk_clean_sheet_run.res.streak_broke': { ru: 'Серия оборвалась именно в том матче, о котором вы думали всю неделю.', en: 'The run ended in exactly the game you had been thinking about all week.' },
  'ev.gk_clean_sheet_run.res.ignore': { ru: 'Вы перестали считать и просто отыграли следующий матч.', en: 'You stopped counting and simply played the next game.' },

  // ─── gk_veteran_backup ────────────────────────────────────────────────────
  'ev.gk_veteran_backup.title': { ru: 'Второй номер в большом клубе', en: 'Number two at a big club' },
  'ev.gk_veteran_backup.body': {
    ru: 'Топ-клуб ищет опытного второго вратаря: деньги и трофеи есть, игрового времени нет. Вратарская карьера часто так и заканчивается.',
    en: 'A big club wants an experienced number two: money and trophies, no minutes. Keepers’ careers often end exactly like this.',
  },
  'ev.gk_veteran_backup.opt.to': { ru: '{club} — {league}, {wage}, вторым номером', en: '{club} — {league}, {wage}, as backup' },
  'ev.gk_veteran_backup.opt.keep_playing': { ru: 'Остаться первым номером', en: 'Stay a number one' },
  'ev.gk_veteran_backup.res.took_bench': { ru: 'Вы перешли в {club} — на скамейку, но за трофеями.', en: 'You joined {club} — for the bench, and for the trophies.' },
  'ev.gk_veteran_backup.hl.took_bench': { ru: 'Ушёл вторым вратарём в {club}', en: 'Joins {club} as a backup keeper' },
  'ev.gk_veteran_backup.res.keep_playing': { ru: 'Вы отказались. Играть важнее, чем сидеть в большом клубе.', en: 'You said no. Playing beats sitting somewhere bigger.' },

  // ─── tournament_moment_gk ─────────────────────────────────────────────────
  'ev.tournament_moment_gk.title': { ru: 'Серия пенальти на турнире', en: 'Shoot-out at the tournament' },
  'ev.tournament_moment_gk.body': {
    ru: 'Серия на {tournament}, и всё решает ваша рамка. Вся страна смотрит на вас, а не на бьющего.',
    en: 'A shoot-out at {tournament}, and it comes down to your goal. A whole country is watching you, not the taker.',
  },
  'ev.tournament_moment_gk.opt.dive_early': { ru: 'Выбрать угол заранее', en: 'Pick a corner early' },
  'ev.tournament_moment_gk.opt.stand_tall': { ru: 'Стоять до конца', en: 'Stand tall' },
  'ev.tournament_moment_gk.res.saved': { ru: 'Вы взяли решающий удар. Эту секунду будут показывать всю вашу жизнь.', en: 'You saved the decisive kick. They will replay that second for the rest of your life.' },
  'ev.tournament_moment_gk.hl.saved': { ru: 'Взял решающий пенальти на турнире', en: 'Saves the decisive penalty at the tournament' },
  'ev.tournament_moment_gk.res.beaten': { ru: 'Мяч в сетке. Эту секунду тоже будут показывать всю вашу жизнь.', en: 'It went in. They will replay that second for the rest of your life too.' },
  'ev.tournament_moment_gk.hl.beaten': { ru: 'Пропустил решающий пенальти', en: 'Beaten by the decisive penalty' },

  // ─── Черты ────────────────────────────────────────────────────────────────
  'trait.shot_stopper': { ru: 'Надёжные руки', en: 'Shot stopper' },
  'trait.sweeper_keeper': { ru: 'Вратарь с ногами', en: 'Sweeper keeper' },
  'trait.commanding': { ru: 'Командует штрафной', en: 'Commands the box' },
  'trait.ice_gloves': { ru: 'Ледяные перчатки', en: 'Ice gloves' },
  'trait.veteran_backup': { ru: 'Опытный второй', en: 'Veteran backup' },
}
