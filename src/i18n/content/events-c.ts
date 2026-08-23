import type { Content } from '../types'

/** Трансферы, сборная, ключевые матчи и структурные решения сезона. */
export const EVENTS_C: Content = {
  // ─── rival_offer ──────────────────────────────────────────────────────────
  'ev.rival_offer.title': { ru: 'Звонок из клуба уровнем выше', en: 'A call from a bigger club' },
  'ev.rival_offer.body': {
    ru: '{rival} хочет вас и предлагает {wage} за сезон. Там собирают состав под трофеи — и конкуренция там другая.',
    en: '{rival} want you and are offering {wage} a season. They are building for trophies — and the competition is different there.',
  },
  'ev.rival_offer.opt.to': { ru: 'Перейти в {club}', en: 'Join {club}' },
  'ev.rival_offer.opt.stay': { ru: 'Остаться', en: 'Stay' },
  'ev.rival_offer.res.moved': { ru: 'Вы перешли в {club}. На старой трибуне вас теперь считают предателем.', en: 'You joined {club}. Your old stands now see you as a traitor.' },
  'ev.rival_offer.hl.moved': { ru: 'Переход в {club}', en: 'Signs for {club}' },
  'ev.rival_offer.res.stayed': { ru: 'Вы остались, и трибуны это оценили как поступок.', en: 'You stayed, and the stands took it as a statement.' },
  'ev.rival_offer.hl.stayed': { ru: 'Отказался от перехода и остался', en: 'Turns down the move and stays' },

  // ─── club_crisis ──────────────────────────────────────────────────────────
  'ev.club_crisis.title': { ru: 'У клуба кризис', en: 'The club is in crisis' },
  'ev.club_crisis.body': {
    ru: 'У {club} проблемы с деньгами и результатом. Зарплаты задерживают, и это не секрет.',
    en: '{club} have money and results problems. Wages are late, and it is no secret.',
  },
  'ev.club_crisis.opt.to': { ru: 'Уйти в {club}', en: 'Leave for {club}' },
  'ev.club_crisis.opt.stay_fight': { ru: 'Остаться и вытаскивать', en: 'Stay and fight' },
  'ev.club_crisis.opt.wage_cut': { ru: 'Урезать себе зарплату', en: 'Take a pay cut' },
  'ev.club_crisis.res.escaped': { ru: 'Вы ушли в {club} до того, как всё рухнуло.', en: 'You left for {club} before it all collapsed.' },
  'ev.club_crisis.hl.escaped': { ru: 'Успел уйти из клуба в кризисе', en: 'Gets out of the crisis club in time' },
  'ev.club_crisis.res.wage_cut': { ru: 'Вы отказались от части денег, чтобы клуб дожил до конца сезона.', en: 'You gave up part of your money so the club could finish the season.' },
  'ev.club_crisis.hl.wage_cut': { ru: 'Отказался от части зарплаты ради клуба', en: 'Gives up part of his wage for the club' },
  'ev.club_crisis.res.stay_fight': { ru: 'Вы остались тянуть сезон. Проще не стало.', en: 'You stayed to drag the season out. It did not get easier.' },

  // ─── contract_renewal ─────────────────────────────────────────────────────
  'ev.contract_renewal.title': { ru: 'Новый контракт', en: 'A new contract' },
  'ev.contract_renewal.body': {
    ru: '{club} предлагает продление на {wage} за сезон. Контракт заканчивается, времени немного.',
    en: '{club} offer an extension at {wage} a season. Your deal is expiring and time is short.',
  },
  'ev.contract_renewal.opt.sign': { ru: 'Подписать', en: 'Sign' },
  'ev.contract_renewal.opt.push_more': { ru: 'Требовать больше', en: 'Push for more' },
  'ev.contract_renewal.opt.run_down': { ru: 'Дотянуть до свободного агента', en: 'Run the deal down' },
  'ev.contract_renewal.res.sign': { ru: 'Контракт подписан без нервов.', en: 'Signed without drama.' },
  'ev.contract_renewal.res.got_more': { ru: 'Клуб уступил: условия выросли почти в полтора раза.', en: 'The club gave in: the terms went up by half again.' },
  'ev.contract_renewal.hl.got_more': { ru: 'Выторговал контракт на новых условиях', en: 'Wins a much better contract' },
  'ev.contract_renewal.res.refused': { ru: 'Клуб отказал и запомнил разговор.', en: 'The club refused, and remembered the conversation.' },
  'ev.contract_renewal.res.run_down': { ru: 'Вы решили дойти до конца контракта. Тренер об этом узнал.', en: 'You decided to see the deal out. The manager found out.' },

  // ─── release_clause ───────────────────────────────────────────────────────
  'ev.release_clause.title': { ru: 'Отступные в контракте', en: 'A release clause' },
  'ev.release_clause.body': {
    ru: 'Агент предлагает вписать в контракт сумму отступных: уйти станет проще, но клуб потребует компенсацию.',
    en: 'Your agent suggests writing in a release clause: leaving gets easier, but the club wants something for it.',
  },
  'ev.release_clause.opt.insert': { ru: 'Вписать отступные', en: 'Insert the clause' },
  'ev.release_clause.opt.no_clause': { ru: 'Взять деньги сейчас', en: 'Take the money now' },
  'ev.release_clause.res.insert': { ru: 'Пункт в контракте есть. Дверь приоткрыта.', en: 'The clause is in. The door is ajar.' },
  'ev.release_clause.res.no_clause': { ru: 'Вы взяли подъёмные и остались без пути к отступлению.', en: 'You took the signing bonus and left yourself no exit.' },

  // ─── triumphant_return ────────────────────────────────────────────────────
  'ev.triumphant_return.title': { ru: 'Первый клуб зовёт назад', en: 'Your first club is calling' },
  'ev.triumphant_return.body': {
    ru: '{club} предлагает вернуться и закончить карьеру там, где всё начиналось. Денег будет меньше.',
    en: '{club} want you back to finish where it started. There will be less money.',
  },
  'ev.triumphant_return.opt.to': { ru: 'Вернуться в {club}', en: 'Return to {club}' },
  'ev.triumphant_return.opt.decline': { ru: 'Не сейчас', en: 'Not now' },
  'ev.triumphant_return.res.returned': { ru: 'Возвращение в {club} собрало полный стадион.', en: 'The return to {club} filled the stadium.' },
  'ev.triumphant_return.hl.returned': { ru: 'Вернулся в {club}', en: 'Returns to {club}' },
  'ev.triumphant_return.res.decline': { ru: 'Вы отказались. Возможно, зря.', en: 'You said no. Possibly a mistake.' },

  // ─── big_money_league ─────────────────────────────────────────────────────
  'ev.big_money_league.title': { ru: 'Предложение за большие деньги', en: 'An offer with serious money' },
  'ev.big_money_league.body': {
    ru: '{club} предлагает {wage} за сезон. Уровень футбола там ниже, вопросов к вам будет много.',
    en: '{club} offer {wage} a season. The football is a level down, and the questions will not stop.',
  },
  'ev.big_money_league.opt.to': { ru: 'Уехать в {club}', en: 'Move to {club}' },
  'ev.big_money_league.opt.decline': { ru: 'Отказаться', en: 'Turn it down' },
  'ev.big_money_league.res.took_money': { ru: 'Вы уехали в {club}. Деньги настоящие, вопросы тоже.', en: 'You moved to {club}. The money is real; so are the questions.' },
  'ev.big_money_league.hl.took_money': { ru: 'Уехал за большими деньгами в {club}', en: 'Takes the big money at {club}' },
  'ev.big_money_league.res.declined': { ru: 'Отказ от таких денег заметили и оценили.', en: 'Turning that money down was noticed and respected.' },

  // ─── agent_pressure ───────────────────────────────────────────────────────
  'ev.agent_pressure.title': { ru: 'Агент настаивает', en: 'Your agent insists' },
  'ev.agent_pressure.body': {
    ru: '{agent} говорит, что здесь вы себя закапываете, и уже с кем-то говорит от вашего имени.',
    en: '{agent} says you are burying yourself here, and is already talking to people on your behalf.',
  },
  'ev.agent_pressure.opt.listen': { ru: 'Слушать агента', en: 'Listen to him' },
  'ev.agent_pressure.opt.refuse': { ru: 'Запретить', en: 'Tell him to stop' },
  'ev.agent_pressure.opt.change_agent': { ru: 'Сменить агента', en: 'Change agents' },
  'ev.agent_pressure.res.listen': { ru: 'Вы дали добро искать варианты.', en: 'You gave him the go-ahead to look.' },
  'ev.agent_pressure.res.refuse': { ru: 'Вы остались при своём, тренер это почувствовал.', en: 'You held your line and the manager felt it.' },
  'ev.agent_pressure.res.change_agent': { ru: 'Вы расстались с агентом. Кто будет вести дела — вопрос открытый.', en: 'You parted with your agent. Who runs your affairs is now an open question.' },

  // ─── new_agent_arrives ────────────────────────────────────────────────────
  'ev.new_agent_arrives.title': { ru: 'Новый агент', en: 'A new agent' },
  'ev.new_agent_arrives.body': {
    ru: 'Два варианта: жёсткий профессионал с репутацией или человек из семьи, которому вы доверяете.',
    en: 'Two options: a hard professional with a reputation, or someone from your family you trust.',
  },
  'ev.new_agent_arrives.opt.aggressive': { ru: 'Жёсткий профессионал', en: 'The hard professional' },
  'ev.new_agent_arrives.opt.family_friend': { ru: 'Человек из семьи', en: 'Family' },
  'ev.new_agent_arrives.res.aggressive': { ru: 'Условия он выбивает лучше всех. Репутация у него соответствующая.', en: 'Nobody negotiates better. His reputation matches.' },
  'ev.new_agent_arrives.res.family_friend': { ru: 'Спокойнее в жизни, слабее в переговорах.', en: 'Calmer in life, weaker at the table.' },

  // ─── homesick_move ────────────────────────────────────────────────────────
  'ev.homesick_move.title': { ru: 'Возвращение домой', en: 'The move home' },
  'ev.homesick_move.body': {
    ru: 'Клубы из {home} готовы вас взять. Вы обещали вернуться.',
    en: 'Clubs in {home} are ready to take you. You promised to come back.',
  },
  'ev.homesick_move.opt.to': { ru: 'Перейти в {club} — {wage}', en: 'Join {club} — {wage}' },
  'ev.homesick_move.opt.stay': { ru: 'Всё-таки остаться', en: 'Stay after all' },
  'ev.homesick_move.res.went_home': { ru: 'Вы вернулись домой, в {club}.', en: 'You went home, to {club}.' },
  'ev.homesick_move.hl.went_home': { ru: 'Вернулся домой, в {club}', en: 'Comes home to {club}' },
  'ev.homesick_move.res.stayed': { ru: 'Вы остались, и обещание так и осталось обещанием.', en: 'You stayed, and the promise stayed a promise.' },

  // ─── first_call_up ────────────────────────────────────────────────────────
  'ev.first_call_up.title': { ru: 'Вызов в сборную', en: 'A national call-up' },
  'ev.first_call_up.body': {
    ru: 'Впервые вызвали в сборную {country}. Сбор идёт посреди клубного сезона.',
    en: 'You have been called up by {country} for the first time. The camp lands mid-club-season.',
  },
  'ev.first_call_up.opt.accept': { ru: 'Ехать', en: 'Go' },
  'ev.first_call_up.opt.wait': { ru: 'Сослаться на нагрузку', en: 'Cite your workload' },
  'ev.first_call_up.res.accept': { ru: 'Дебют состоялся. Такое случается один раз.', en: 'The debut happened. That only happens once.' },
  'ev.first_call_up.hl.accept': { ru: 'Дебютировал за сборную', en: 'Makes his national-team debut' },
  'ev.first_call_up.res.wait': { ru: 'Вы отказались от первого вызова. Такое помнят.', en: 'You turned down a first call-up. People remember that.' },

  // ─── foreign_grandfather ──────────────────────────────────────────────────
  'ev.foreign_grandfather.title': { ru: 'Второе гражданство', en: 'A second passport' },
  'ev.foreign_grandfather.body': {
    ru: 'Выяснилось, что по деду вы можете играть за {country}. Там уровень выше и попасть сложнее.',
    en: 'It turns out that through your grandfather you could play for {country}. Higher level, harder to break into.',
  },
  'ev.foreign_grandfather.opt.switch': { ru: 'Играть за {country}', en: 'Play for {country}' },
  'ev.foreign_grandfather.opt.stay': { ru: 'Остаться со своей сборной', en: 'Stay with your country' },
  'ev.foreign_grandfather.res.switched': { ru: 'Вы сменили сборную на {country}. Дома это приняли тяжело.', en: 'You switched to {country}. At home they took it badly.' },
  'ev.foreign_grandfather.hl.switched': { ru: 'Сменил сборную', en: 'Switches national teams' },
  'ev.foreign_grandfather.res.stayed': { ru: 'Вы остались со своими. Это тоже решение.', en: 'You stayed with your own. That is a decision too.' },

  // ─── club_vs_national ─────────────────────────────────────────────────────
  'ev.club_vs_national.title': { ru: 'Клуб против сборной', en: 'Club against country' },
  'ev.club_vs_national.body': {
    ru: '{country} вызывает на товарищеские, {club} просит остаться и восстанавливаться.',
    en: '{country} want you for friendlies; {club} want you to stay and recover.',
  },
  'ev.club_vs_national.opt.go_national': { ru: 'Ехать в сборную', en: 'Go with your country' },
  'ev.club_vs_national.opt.stay_club': { ru: 'Остаться в клубе', en: 'Stay with the club' },
  'ev.club_vs_national.res.go_national': { ru: 'Вы поехали. В клубе это записали.', en: 'You went. The club made a note of it.' },
  'ev.club_vs_national.res.stay_club': { ru: 'Вы остались, и тренер сборной вас понял по-своему.', en: 'You stayed, and the national coach drew his own conclusions.' },

  // ─── national_captain ─────────────────────────────────────────────────────
  'ev.national_captain.title': { ru: 'Капитан сборной', en: 'Captain of your country' },
  'ev.national_captain.body': {
    ru: 'Тренер {country} предлагает вам повязку сборной.',
    en: 'The {country} manager offers you the national armband.',
  },
  'ev.national_captain.opt.accept': { ru: 'Принять', en: 'Accept' },
  'ev.national_captain.opt.decline': { ru: 'Отказаться', en: 'Decline' },
  'ev.national_captain.res.accept': { ru: 'Вы капитан сборной. Выше в этой профессии почти ничего нет.', en: 'You captain your country. There is almost nothing above that.' },
  'ev.national_captain.hl.accept': { ru: 'Стал капитаном сборной', en: 'Named captain of his country' },
  'ev.national_captain.res.decline': { ru: 'Вы отказались от повязки.', en: 'You turned the armband down.' },

  // ─── national_snub ────────────────────────────────────────────────────────
  'ev.national_snub.title': { ru: 'Вас не взяли', en: 'Left out' },
  'ev.national_snub.body': {
    ru: 'В заявку на {tournament} вы не попали. Объяснение было формальным.',
    en: 'You did not make the squad for {tournament}. The explanation was a formality.',
  },
  'ev.national_snub.opt.answer_pitch': { ru: 'Отвечать игрой', en: 'Answer with performances' },
  'ev.national_snub.opt.complain': { ru: 'Высказаться публично', en: 'Say it publicly' },
  'ev.national_snub.opt.retire_national': { ru: 'Закончить со сборной', en: 'Retire from international football' },
  'ev.national_snub.res.answer_pitch': { ru: 'Вы вернулись в форму и заставили о себе говорить.', en: 'You found form and made them talk about you.' },
  'ev.national_snub.res.recalled': { ru: 'Слова дошли до тренера, и вас вернули.', en: 'The words reached the coach and you were recalled.' },
  'ev.national_snub.hl.recalled': { ru: 'Вернулся в сборную после публичного спора', en: 'Recalled after going public' },
  'ev.national_snub.res.blacklisted': { ru: 'Тренер закрыл вопрос: в сборную вас больше не позовут.', en: 'The coach closed the matter: no more call-ups.' },
  'ev.national_snub.hl.blacklisted': { ru: 'Дорога в сборную закрыта', en: 'The national-team door closes' },
  'ev.national_snub.res.retire_national': { ru: 'Вы объявили, что за сборную больше не играете.', en: 'You announced you are done with international football.' },
  'ev.national_snub.hl.retire_national': { ru: 'Завершил карьеру в сборной', en: 'Retires from international football' },

  // ─── tournament_moment ────────────────────────────────────────────────────
  'ev.tournament_moment.title': { ru: 'Решающий момент турнира', en: 'The tournament’s decisive moment' },
  'ev.tournament_moment.body': {
    ru: 'Серия пенальти на {tournament}. Тренер смотрит на вас и ждёт ответа.',
    en: 'A shoot-out at {tournament}. The coach looks at you and waits for an answer.',
  },
  'ev.tournament_moment.opt.step_up': { ru: 'Взять мяч', en: 'Take the ball' },
  'ev.tournament_moment.opt.let_other': { ru: 'Уступить другому', en: 'Let someone else' },
  'ev.tournament_moment.res.let_other': { ru: 'Пробил другой. Вы стояли в центре поля и смотрели.', en: 'Someone else took it. You stood on the halfway line and watched.' },
  'ev.tournament_moment.res.scored': { ru: 'Вы забили. Эту секунду будут показывать всю вашу жизнь.', en: 'You scored. They will replay that second for the rest of your life.' },
  'ev.tournament_moment.hl.scored': { ru: 'Забил решающий пенальти на турнире', en: 'Scores the decisive penalty at the tournament' },
  'ev.tournament_moment.res.missed': { ru: 'Мяч ушёл выше. Эту секунду тоже будут показывать всю вашу жизнь.', en: 'It went over. They will replay that second for the rest of your life too.' },
  'ev.tournament_moment.hl.missed': { ru: 'Промахнулся в решающей серии', en: 'Misses in the decisive shoot-out' },

  // ─── redemption_arc ───────────────────────────────────────────────────────
  'ev.redemption_arc.title': { ru: 'После промаха', en: 'After the miss' },
  'ev.redemption_arc.body': {
    ru: 'Про тот удар спрашивают на каждой пресс-конференции. Надо что-то с этим делать.',
    en: 'They ask about that kick at every press conference. Something has to be done with it.',
  },
  'ev.redemption_arc.opt.work': { ru: 'Работать и отвечать игрой', en: 'Work and answer on the pitch' },
  'ev.redemption_arc.opt.hide': { ru: 'Закрыться', en: 'Shut yourself away' },
  'ev.redemption_arc.res.work': { ru: 'Вы вернулись сильнее, и об этом стали писать иначе.', en: 'You came back stronger, and the coverage changed.' },
  'ev.redemption_arc.res.hide': { ru: 'Год прошёл на автопилоте.', en: 'A year went by on autopilot.' },

  // ─── title_decider ────────────────────────────────────────────────────────
  'ev.title_decider.title': { ru: 'Матч, решающий всё', en: 'The match that decides it' },
  'ev.title_decider.body': {
    ru: 'У {club} последняя атака. Мяч у вас, вратарь вышел, партнёр открылся слева.',
    en: '{club} are on the last attack. The ball is yours, the keeper is out, a teammate is free on the left.',
  },
  'ev.title_decider.opt.shoot': { ru: 'Бить самому', en: 'Shoot yourself' },
  'ev.title_decider.opt.square': { ru: 'Отдать партнёру', en: 'Square it' },
  'ev.title_decider.opt.win_foul': { ru: 'Заработать стандарт', en: 'Win a foul' },
  'ev.title_decider.res.scored': { ru: 'Мяч в сетке. Стадион не сядет ещё десять минут.', en: 'In the net. The stadium will not sit down for ten minutes.' },
  'ev.title_decider.hl.scored': { ru: 'Забил в матче, решающем сезон', en: 'Scores in the match that decides the season' },
  'ev.title_decider.res.wasted': { ru: 'Мимо. Такое припоминают годами.', en: 'Wide. They bring that up for years.' },
  'ev.title_decider.hl.wasted': { ru: 'Не забил в решающем матче', en: 'Misses in the decisive match' },
  'ev.title_decider.res.assisted': { ru: 'Пас был идеальным, и партнёр не подвёл.', en: 'The pass was perfect and your teammate did the rest.' },
  'ev.title_decider.hl.assisted': { ru: 'Отдал решающую передачу', en: 'Provides the decisive assist' },
  'ev.title_decider.res.intercepted': { ru: 'Передачу перехватили. Момент ушёл.', en: 'The pass was cut out. The moment went.' },
  'ev.title_decider.res.win_foul': { ru: 'Вы выбили стандарт и время. Не красиво, зато полезно.', en: 'You won a free kick and some time. Not pretty, but useful.' },

  // ─── cup_final_penalties ──────────────────────────────────────────────────
  'ev.cup_final_penalties.title': { ru: 'Серия пенальти в финале', en: 'Penalties in the final' },
  'ev.cup_final_penalties.body': {
    ru: 'Тренер расписывает очередь. Первый удар задаёт тон, пятый решает всё.',
    en: 'The manager is writing the order. The first sets the tone; the fifth decides everything.',
  },
  'ev.cup_final_penalties.opt.first': { ru: 'Бить первым', en: 'Take the first' },
  'ev.cup_final_penalties.opt.fifth': { ru: 'Бить пятым', en: 'Take the fifth' },
  'ev.cup_final_penalties.opt.skip': { ru: 'Не бить', en: 'Stay out of it' },
  'ev.cup_final_penalties.res.skip': { ru: 'Вы не пошли к точке. Это тоже заметили.', en: 'You did not walk up. That was noticed too.' },
  'ev.cup_final_penalties.res.scored': { ru: 'Вы забили свой удар уверенно.', en: 'You scored yours without a flicker.' },
  'ev.cup_final_penalties.hl.scored': { ru: 'Забил свой пенальти в финале', en: 'Converts his penalty in the final' },
  'ev.cup_final_penalties.res.won_it': { ru: 'Пятый удар — ваш. Кубок тоже.', en: 'The fifth was yours. So is the cup.' },
  'ev.cup_final_penalties.hl.won_it': { ru: 'Принёс победу в финале с точки', en: 'Wins the final from the spot' },
  'ev.cup_final_penalties.res.missed': { ru: 'Вратарь угадал. В раздевалке было очень тихо.', en: 'The keeper guessed right. The dressing room was very quiet.' },
  'ev.cup_final_penalties.hl.missed': { ru: 'Промахнулся в финальной серии', en: 'Misses in the final shoot-out' },

  // ─── derby_provocation ────────────────────────────────────────────────────
  'ev.derby_provocation.title': { ru: 'Дерби, вас провоцируют', en: 'Derby day, and they are baiting you' },
  'ev.derby_provocation.body': {
    ru: 'Соперник весь матч работает вам по ногам и говорит лишнее. Судья ничего не видит.',
    en: 'An opponent has been kicking you all game and saying too much. The referee sees nothing.',
  },
  'ev.derby_provocation.opt.retaliate': { ru: 'Ответить', en: 'Retaliate' },
  'ev.derby_provocation.opt.ignore': { ru: 'Не реагировать', en: 'Ignore it' },
  'ev.derby_provocation.opt.wind_up': { ru: 'Довести его', en: 'Wind him up instead' },
  'ev.derby_provocation.res.sent_off': { ru: 'Ответ увидели все, включая судью. Красная.', en: 'Everyone saw the answer, referee included. Red card.' },
  'ev.derby_provocation.hl.sent_off': { ru: 'Удалён в дерби', en: 'Sent off in the derby' },
  'ev.derby_provocation.res.got_away': { ru: 'Ответили так, что судья не заметил. Соперник понял.', en: 'You answered where the referee could not see. He got the message.' },
  'ev.derby_provocation.res.rival_off': { ru: 'Он не выдержал первым и ушёл с поля.', en: 'He cracked first and walked.' },
  'ev.derby_provocation.hl.rival_off': { ru: 'Довёл соперника до красной карточки', en: 'Baits an opponent into a red card' },
  'ev.derby_provocation.res.backfired': { ru: 'Игра ушла из головы, и матч тоже.', en: 'You lost the thread, and the game with it.' },
  'ev.derby_provocation.res.ignore': { ru: 'Вы отыграли выше этого. Тренер отметил отдельно.', en: 'You played above it. The manager mentioned it afterwards.' },

  // ─── honesty_test ─────────────────────────────────────────────────────────
  'ev.honesty_test.title': { ru: 'Предложение сыграть плохо', en: 'An offer to play badly' },
  'ev.honesty_test.body': {
    ru: 'Человек без имени предлагает {amount} за один неудачный матч. Говорит, что никто не заметит.',
    en: 'A man with no name offers {amount} for one bad game. He says nobody will notice.',
  },
  'ev.honesty_test.opt.take': { ru: 'Взять деньги', en: 'Take the money' },
  'ev.honesty_test.opt.refuse': { ru: 'Отказать', en: 'Refuse' },
  'ev.honesty_test.opt.report': { ru: 'Сдать его', en: 'Report him' },
  'ev.honesty_test.res.caught': { ru: 'Заметили. Дисквалификация, разбирательство и конец репутации.', en: 'They noticed. A ban, an inquiry and the end of your reputation.' },
  'ev.honesty_test.hl.caught': { ru: 'Дисквалификация за сдачу матча', en: 'Banned over a fixed match' },
  'ev.honesty_test.res.took_it': { ru: 'Деньги пришли. Играть после этого было противно.', en: 'The money came. Playing after that was sickening.' },
  'ev.honesty_test.res.report': { ru: 'Вы пошли в лигу и рассказали всё. Вас поставили в пример.', en: 'You went to the league and told them everything. They held you up as an example.' },
  'ev.honesty_test.hl.report': { ru: 'Сообщил о попытке сдать матч', en: 'Reports a match-fixing approach' },
  'ev.honesty_test.res.refuse': { ru: 'Вы отказались и ушли. Ночь была длинной.', en: 'You refused and walked away. It was a long night.' },

  // ─── out_of_position ──────────────────────────────────────────────────────
  'ev.out_of_position.title': { ru: 'Просят сыграть не на своей позиции', en: 'Asked to play out of position' },
  'ev.out_of_position.body': {
    ru: 'Тренер просит закрыть другую зону: ваш «{position}» ему сейчас важнее в другом месте.',
    en: 'The manager needs another area covered: he wants your {position} qualities elsewhere.',
  },
  'ev.out_of_position.opt.accept': { ru: 'Сыграть где нужно', en: 'Play where needed' },
  'ev.out_of_position.opt.refuse': { ru: 'Отказаться', en: 'Refuse' },
  'ev.out_of_position.opt.switch_for_good': { ru: 'Сменить позицию окончательно', en: 'Change position for good' },
  'ev.out_of_position.res.accept': { ru: 'Вы закрыли дыру, и тренер это запомнил.', en: 'You plugged the hole and the manager remembered.' },
  'ev.out_of_position.res.switched': { ru: 'Вы окончательно перешли на «{position}». Начинать пришлось почти заново.', en: 'You moved to {position} permanently. It meant starting over.' },
  'ev.out_of_position.hl.switched': { ru: 'Сменил позицию', en: 'Changes position' },
  'ev.out_of_position.res.refuse': { ru: 'Вы отказались. Отношения с тренером стали короче.', en: 'You refused. Your relationship with the manager got shorter.' },

  // ─── last_minute_chance ───────────────────────────────────────────────────
  'ev.last_minute_chance.title': { ru: 'Момент на последней минуте', en: 'A chance in the last minute' },
  'ev.last_minute_chance.body': {
    ru: 'Мяч у вас, до штрафной десять метров, защитник один. Времени на размышления нет.',
    en: 'The ball is yours, ten metres from the box, one defender left. No time to think.',
  },
  'ev.last_minute_chance.opt.shoot': { ru: 'Бить сразу', en: 'Shoot straight away' },
  'ev.last_minute_chance.opt.dribble': { ru: 'Идти в обыгрыш', en: 'Take him on' },
  'ev.last_minute_chance.opt.hold': { ru: 'Придержать мяч', en: 'Hold the ball' },
  'ev.last_minute_chance.res.scored': { ru: 'Удар получился идеальным.', en: 'The strike was perfect.' },
  'ev.last_minute_chance.res.over': { ru: 'Выше перекладины.', en: 'Over the bar.' },
  'ev.last_minute_chance.res.beat_them': { ru: 'Вы прошли его и забили. Такое ставят в нарезки.', en: 'You went past him and scored. That makes the highlight reels.' },
  'ev.last_minute_chance.hl.beat_them': { ru: 'Обыграл защитника и забил на последней минуте', en: 'Beats his man and scores in the last minute' },
  'ev.last_minute_chance.res.hurt': { ru: 'Обыгрыш закончился подкатом по голеностопу.', en: 'The dribble ended with a tackle on your ankle.' },
  'ev.last_minute_chance.res.dispossessed': { ru: 'Мяч отобрали, и на этом всё закончилось.', en: 'You were dispossessed and that was that.' },
  'ev.last_minute_chance.res.hold': { ru: 'Вы придержали мяч и довели матч до свистка.', en: 'You held the ball and saw the game out.' },

  // ─── season_objective ─────────────────────────────────────────────────────
  'ev.season_objective.title': { ru: 'Задача на сезон', en: 'The season objective' },
  'ev.season_objective.body': {
    ru: '{club} ставит вам задачу: {kind} — {target}. Условия обсуждаемы, но не бесконечно.',
    en: '{club} set your target: {kind} — {target}. It is negotiable, but not infinitely.',
  },
  'ev.season_objective.opt.accept': { ru: 'Согласиться', en: 'Accept it' },
  'ev.season_objective.opt.negotiate': { ru: 'Просить планку ниже', en: 'Ask for a lower bar' },
  'ev.season_objective.opt.raise': { ru: 'Пообещать больше', en: 'Promise more' },
  'ev.season_objective.res.accept': { ru: 'Задача принята.', en: 'Target accepted.' },
  'ev.season_objective.res.negotiate': { ru: 'Планку снизили, но тренер сделал вывод.', en: 'The bar came down, and the manager drew a conclusion.' },
  'ev.season_objective.res.raise': { ru: 'Вы пообещали больше, и это записали.', en: 'You promised more, and it was written down.' },

  // ─── academy_choice ───────────────────────────────────────────────────────
  'ev.academy_choice.title': { ru: 'Куда идти', en: 'Where to go' },
  'ev.academy_choice.body': {
    ru: 'Три клуба готовы подписать контракт. Дальше всё будет считаться от этого выбора.',
    en: 'Three clubs are ready to sign you. Everything after this counts from here.',
  },
  'ev.academy_choice.opt.to': { ru: '{club} — {league}', en: '{club} — {league}' },
  'ev.academy_choice.res.signed': { ru: 'Первый контракт подписан: {club}.', en: 'First contract signed: {club}.' },
  'ev.academy_choice.hl.signed': { ru: 'Подписал первый контракт с {club}', en: 'Signs a first contract with {club}' },

  // ─── market_decision ──────────────────────────────────────────────────────
  'ev.market_decision.title': { ru: 'Трансферное окно', en: 'The transfer window' },
  'ev.market_decision.body': {
    ru: 'Сезон закончился. Вот что есть на столе.',
    en: 'The season is over. Here is what is on the table.',
  },
  'ev.market_decision.opt.to': { ru: '{club} — {league}, {wage}, роль: {role}', en: '{club} — {league}, {wage}, role: {role}' },
  'ev.market_decision.opt.loan': { ru: 'Аренда: {club} — {league}', en: 'Loan: {club} — {league}' },
  'ev.market_decision.opt.stay': { ru: 'Остаться в {club}', en: 'Stay at {club}' },
  'ev.market_decision.opt.retire': { ru: 'Завершить карьеру', en: 'Retire' },
  'ev.market_decision.res.stay': { ru: 'Вы остались. Трибуны это ценят.', en: 'You stayed. The stands value that.' },
  'ev.market_decision.res.transferred': { ru: 'Новый клуб — {club}.', en: 'New club: {club}.' },
  'ev.market_decision.hl.transferred': { ru: 'Перешёл в {club}', en: 'Joins {club}' },
  'ev.market_decision.res.loaned': { ru: 'Аренда в {club}: нужны минуты.', en: 'Loaned to {club}: you need minutes.' },
  'ev.market_decision.hl.loaned': { ru: 'Отправился в аренду в {club}', en: 'Goes on loan to {club}' },
  'ev.market_decision.res.retire': { ru: 'Вы решили, что этого достаточно.', en: 'You decided that was enough.' },
  'ev.market_decision.hl.retire': { ru: 'Объявил о завершении карьеры', en: 'Announces his retirement' },

  // ─── loan_return ──────────────────────────────────────────────────────────
  'ev.loan_return.title': { ru: 'Аренда закончилась', en: 'The loan is over' },
  'ev.loan_return.body': {
    ru: 'Вы возвращаетесь в {club}. Можно бороться за место там, можно уехать ещё раз.',
    en: 'You are going back to {club}. Fight for a place there, or go out again.',
  },
  'ev.loan_return.opt.to': { ru: 'Вернуться в {club}', en: 'Return to {club}' },
  'ev.loan_return.opt.loan': { ru: 'Новая аренда: {club} — {league}', en: 'New loan: {club} — {league}' },
  'ev.loan_return.res.returned': { ru: 'Вы вернулись в {club} и начинаете с нуля.', en: 'You are back at {club}, starting from scratch.' },
  'ev.loan_return.res.loaned_again': { ru: 'Ещё одна аренда: {club}.', en: 'Another loan: {club}.' },

  // ─── no_offers ────────────────────────────────────────────────────────────
  'ev.no_offers.title': { ru: 'Предложений нет', en: 'No offers' },
  'ev.no_offers.body': {
    ru: 'Телефон молчит. Клубы вашего уровня закрыли состав, остались варианты пониже.',
    en: 'The phone is silent. Clubs at your level are done; what is left is a level down.',
  },
  'ev.no_offers.opt.drop_down': { ru: 'Идти уровнем ниже', en: 'Drop down a level' },
  'ev.no_offers.opt.retire': { ru: 'Завершить карьеру', en: 'Retire' },
  'ev.no_offers.opt.train_alone': { ru: 'Тренироваться самому и ждать', en: 'Train alone and wait' },
  'ev.no_offers.res.retire': { ru: 'Вы закончили. Без прощального матча.', en: 'You are done. No farewell game.' },
  'ev.no_offers.hl.retire': { ru: 'Завершил карьеру без предложений', en: 'Retires with no offers on the table' },
  'ev.no_offers.res.drop_down': { ru: 'Новый клуб — {club}. Уровень ниже, зато играете.', en: 'New club: {club}. A level down, but you play.' },
  'ev.no_offers.res.train_alone': { ru: 'Вы тренировались один и ждали звонка. Форма ушла.', en: 'You trained alone and waited for the phone. The form went.' },

  // ─── retirement_thoughts ──────────────────────────────────────────────────
  'ev.retirement_thoughts.title': { ru: 'Ещё один сезон?', en: 'One more season?' },
  'ev.retirement_thoughts.body': {
    ru: 'Тело говорит одно, голова другое. Решать вам.',
    en: 'The body says one thing, the head another. It is your call.',
  },
  'ev.retirement_thoughts.opt.one_more': { ru: 'Ещё один сезон', en: 'One more season' },
  'ev.retirement_thoughts.opt.retire': { ru: 'Закончить', en: 'Call it a career' },
  'ev.retirement_thoughts.res.one_more': { ru: 'Ещё один. Последний танец.', en: 'One more. The last dance.' },
  'ev.retirement_thoughts.res.retire': { ru: 'Вы закончили на своих условиях.', en: 'You finished on your own terms.' },
  'ev.retirement_thoughts.hl.retire': { ru: 'Завершил карьеру на своих условиях', en: 'Retires on his own terms' },

  // ─── title_run_focus ──────────────────────────────────────────────────────
  'ev.title_run_focus.title': { ru: 'На что играем', en: 'What are we playing for' },
  'ev.title_run_focus.body': {
    ru: 'Календарь у {club} плотный, и всё сразу не вытянуть. Тренер спрашивает мнение лидеров.',
    en: 'The {club} calendar is packed and you cannot chase everything. The manager is asking his senior players.',
  },
  'ev.title_run_focus.opt.league': { ru: 'Лига', en: 'The league' },
  'ev.title_run_focus.opt.cup': { ru: 'Кубки', en: 'The cups' },
  'ev.title_run_focus.opt.both': { ru: 'Тянуть всё', en: 'Chase everything' },
  'ev.title_run_focus.res.league': { ru: 'Команда бросила силы в лигу.', en: 'The squad threw everything at the league.' },
  'ev.title_run_focus.res.cup': { ru: 'Ставка на кубки принята.', en: 'The cups it is.' },
  'ev.title_run_focus.res.both': { ru: 'Играем всё. Ноги к маю будут чужие.', en: 'Everything, then. By May your legs will belong to someone else.' },

  // ─── wage_dispute ─────────────────────────────────────────────────────────
  'ev.wage_dispute.title': { ru: 'Вы недоплачены', en: 'You are underpaid' },
  'ev.wage_dispute.body': {
    ru: 'По уровню вам положено около {fair}, а в контракте {current}. Агент считает, что пора говорить.',
    en: 'Your level is worth about {fair}; the contract says {current}. Your agent thinks it is time to talk.',
  },
  'ev.wage_dispute.opt.demand': { ru: 'Требовать пересмотр', en: 'Demand a review' },
  'ev.wage_dispute.opt.wait': { ru: 'Подождать', en: 'Wait' },
  'ev.wage_dispute.opt.strike': { ru: 'Отказаться тренироваться', en: 'Refuse to train' },
  'ev.wage_dispute.res.granted': { ru: 'Клуб согласился и поднял зарплату.', en: 'The club agreed and raised your wage.' },
  'ev.wage_dispute.res.denied': { ru: 'Отказ. Разговор оставил осадок.', en: 'Refused. The conversation left a residue.' },
  'ev.wage_dispute.res.strike_won': { ru: 'Клуб уступил, но так это не забудется.', en: 'The club gave in, but nobody will forget how.' },
  'ev.wage_dispute.hl.strike_won': { ru: 'Добился пересмотра контракта через конфликт', en: 'Forces a new contract through a standoff' },
  'ev.wage_dispute.res.strike_lost': { ru: 'Клуб оштрафовал вас и посадил на скамейку.', en: 'The club fined you and sat you on the bench.' },
  'ev.wage_dispute.hl.strike_lost': { ru: 'Отказ тренироваться закончился штрафом', en: 'Refusal to train ends in a fine' },
  'ev.wage_dispute.res.wait': { ru: 'Вы подождали. Иногда это лучший ход.', en: 'You waited. Sometimes that is the best move.' },
}
