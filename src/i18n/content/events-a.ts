import type { Content } from '../types'

/** Тренировки, медицина, раздевалка. */
export const EVENTS_A: Content = {
  // ─── extra_training ───────────────────────────────────────────────────────
  'ev.extra_training.title': { ru: 'Двойные тренировки', en: 'Double sessions' },
  'ev.extra_training.body': {
    ru: 'Тренер по физподготовке предлагает остаться на второе занятие. Прибавка будет, но и организм считает нагрузку.',
    en: 'The fitness coach offers a second session each day. It will pay off, but the body keeps score.',
  },
  'ev.extra_training.opt.push': { ru: 'Работать на максимум', en: 'Go all out' },
  'ev.extra_training.opt.balanced': { ru: 'Держать середину', en: 'Keep it moderate' },
  'ev.extra_training.opt.rest': { ru: 'Поберечься', en: 'Protect the body' },
  'ev.extra_training.res.hurt': { ru: 'На третьей неделе мышца не выдержала. Сорвались на пустом месте.', en: 'In the third week a muscle gave out. Broken down for nothing.' },
  'ev.extra_training.hl.hurt': { ru: 'Сорвался на двойных тренировках', en: 'Broke down in double sessions' },
  'ev.extra_training.res.gain': { ru: 'Тело выдержало, и разница видна уже в первых матчах.', en: 'The body held and the difference shows in the first games.' },
  'ev.extra_training.res.ok': { ru: 'Спокойная работа без надрыва: маленький, но честный шаг вперёд.', en: 'Steady work, no heroics: a small honest step forward.' },
  'ev.extra_training.res.rest': { ru: 'Вы свежи, но тренер это заметил и запомнил.', en: 'You are fresh, and the coach noticed — and remembered.' },

  // ─── preseason_camp ───────────────────────────────────────────────────────
  'ev.preseason_camp.title': { ru: 'Летний сбор', en: 'Preseason camp' },
  'ev.preseason_camp.body': {
    ru: 'Клуб везёт команду на сбор. Можно уехать на высоту, можно остаться на тактические занятия, а можно вообще пропустить.',
    en: 'The club is taking the squad away. Altitude work, tactical sessions, or skip it entirely.',
  },
  'ev.preseason_camp.opt.altitude': { ru: 'Сбор на высоте', en: 'Altitude camp' },
  'ev.preseason_camp.opt.tactical': { ru: 'Тактический блок', en: 'Tactical block' },
  'ev.preseason_camp.opt.skip': { ru: 'Пропустить сбор', en: 'Skip the camp' },
  'ev.preseason_camp.res.overtrained': { ru: 'Перегорели: к первому туру ноги были деревянные.', en: 'You overcooked it: legs like wood by matchday one.' },
  'ev.preseason_camp.res.strong': { ru: 'Дыхание другое. К августу вы в лучшей форме в команде.', en: 'Your lungs feel different. By August you are the fittest in the squad.' },
  'ev.preseason_camp.res.tactical': { ru: 'Тренер увидел, что вы понимаете его схему быстрее остальных.', en: 'The manager saw you read his shape quicker than anyone.' },
  'ev.preseason_camp.res.skip': { ru: 'Отдых пошёл на пользу телу и во вред репутации.', en: 'The rest helped your body and hurt your standing.' },

  // ─── personal_coach ───────────────────────────────────────────────────────
  'ev.personal_coach.title': { ru: 'Личный тренер', en: 'Personal coach' },
  'ev.personal_coach.body': {
    ru: 'Специалист предлагает переделать вашу технику за {cost}. Обещает прорыв, но ломать привычное — риск.',
    en: 'A specialist offers to rebuild your technique for {cost}. He promises a leap; unlearning habits is a risk.',
  },
  'ev.personal_coach.opt.hire': { ru: 'Нанять', en: 'Hire him' },
  'ev.personal_coach.opt.decline': { ru: 'Обойтись своими силами', en: 'Do it my way' },
  'ev.personal_coach.res.decline': { ru: 'Вы остались при своей технике. И при своих деньгах.', en: 'You kept your technique. And your money.' },
  'ev.personal_coach.res.worked': { ru: 'Сработало: движение стало чище, и это видно.', en: 'It worked: the movement is cleaner, and it shows.' },
  'ev.personal_coach.res.failed': { ru: 'Перестройка не пошла. Вы потеряли автоматизм и месяц уверенности.', en: 'The rebuild failed. You lost your automatisms and a month of confidence.' },

  // ─── nutritionist ─────────────────────────────────────────────────────────
  'ev.nutritionist.title': { ru: 'Диетолог', en: 'Nutritionist' },
  'ev.nutritionist.body': {
    ru: 'Клубный диетолог принёс план питания. Строгий режим работает, но жить по нему тяжело.',
    en: 'The club nutritionist brought a plan. Strict works, but living by it is hard.',
  },
  'ev.nutritionist.opt.strict': { ru: 'Строго по плану', en: 'Follow it strictly' },
  'ev.nutritionist.opt.moderate': { ru: 'Без фанатизма', en: 'Without fanaticism' },
  'ev.nutritionist.opt.ignore': { ru: 'Есть как раньше', en: 'Eat as before' },
  'ev.nutritionist.res.strict': { ru: 'Восстанавливаетесь заметно быстрее. Радости в жизни стало меньше.', en: 'You recover noticeably faster. There is less joy in your week.' },
  'ev.nutritionist.res.moderate': { ru: 'Разумный компромисс, и он работает.', en: 'A sensible compromise, and it works.' },
  'ev.nutritionist.res.ignore': { ru: 'Ничего не изменилось — и это не в вашу пользу.', en: 'Nothing changed — and that is not in your favour.' },

  // ─── gym_bulk ─────────────────────────────────────────────────────────────
  'ev.gym_bulk.title': { ru: 'Работа в зале', en: 'Gym work' },
  'ev.gym_bulk.body': {
    ru: 'Зимой можно набрать массу или, наоборот, поработать над спринтом. Одно тянет за собой другое.',
    en: 'You can add mass this winter, or work on sprinting instead. One always costs the other.',
  },
  'ev.gym_bulk.opt.bulk': { ru: 'Набрать массу', en: 'Add mass' },
  'ev.gym_bulk.opt.sprint': { ru: 'Работать над скоростью', en: 'Work on speed' },
  'ev.gym_bulk.opt.skip': { ru: 'Ничего не менять', en: 'Change nothing' },
  'ev.gym_bulk.res.bulk': { ru: 'В стыках стало легче, в отрывах — тяжелее.', en: 'Duels got easier, sprints got heavier.' },
  'ev.gym_bulk.res.pulled': { ru: 'Потянули заднюю на пятом ускорении. Скорость выросла, но цена высокая.', en: 'You pulled a hamstring on the fifth sprint. Faster, but at a price.' },
  'ev.gym_bulk.res.faster': { ru: 'Первые пять метров стали заметно острее.', en: 'Your first five metres are noticeably sharper.' },
  'ev.gym_bulk.res.skip': { ru: 'Зима прошла спокойно.', en: 'The winter passed quietly.' },

  // ─── sports_science ───────────────────────────────────────────────────────
  'ev.sports_science.title': { ru: 'Отдел нагрузки', en: 'Load management' },
  'ev.sports_science.body': {
    ru: 'Аналитики говорят, что по данным вы на грани и просят снизить нагрузку. Тренер хочет вас в составе.',
    en: 'The analysts say the data has you on the edge and want your load cut. The manager wants you on the pitch.',
  },
  'ev.sports_science.opt.follow': { ru: 'Слушать данные', en: 'Trust the data' },
  'ev.sports_science.opt.override': { ru: 'Играть всё', en: 'Play everything' },
  'ev.sports_science.res.follow': { ru: 'Пропустили часть матчей, но вышли из сезона целым.', en: 'You missed games, but came out of the season whole.' },
  'ev.sports_science.res.broke_down': { ru: 'Организм посчитал раньше вас: вы сломались посреди сезона.', en: 'The body did the maths first: you broke down mid-season.' },
  'ev.sports_science.hl.broke_down': { ru: 'Сломался, отыграв всё подряд', en: 'Broke down after playing everything' },
  'ev.sports_science.res.held': { ru: 'Вы отыграли всё и выдержали. Тренер и трибуны это запомнят.', en: 'You played it all and held up. The manager and the stands will remember.' },

  // ─── video_study ──────────────────────────────────────────────────────────
  'ev.video_study.title': { ru: 'Разбор соперника', en: 'Opponent analysis' },
  'ev.video_study.body': {
    ru: 'Аналитик оставил вам нарезку по следующим соперникам. Смотреть — час своего вечера.',
    en: 'The analyst left you a reel on the next opponents. Watching it costs an evening.',
  },
  'ev.video_study.opt.study': { ru: 'Разобрать', en: 'Study it' },
  'ev.video_study.opt.rest': { ru: 'Отдохнуть', en: 'Rest instead' },
  'ev.video_study.res.study': { ru: 'На поле вы читаете эпизоды на шаг раньше.', en: 'On the pitch you read situations a step earlier.' },
  'ev.video_study.res.rest': { ru: 'Вечер свой, голова свежая.', en: 'Your evening, your clear head.' },

  // ─── mysterious_substance ─────────────────────────────────────────────────
  'ev.mysterious_substance.title': { ru: 'Препарат неясного происхождения', en: 'A substance of unclear origin' },
  'ev.mysterious_substance.body': {
    ru: 'Клубный врач протягивает флакон и говорит, что «в списках этого нет». Проверок никто не отменял.',
    en: 'The club doctor holds out a bottle and says it "is not on any list". The tests have not gone anywhere.',
  },
  'ev.mysterious_substance.opt.take': { ru: 'Принять', en: 'Take it' },
  'ev.mysterious_substance.opt.refuse': { ru: 'Отказаться', en: 'Refuse' },
  'ev.mysterious_substance.opt.report': { ru: 'Сообщить куда следует', en: 'Report it' },
  'ev.mysterious_substance.res.caught': { ru: 'Проба показала запрещённое. Дисквалификация и разгромная пресса.', en: 'The sample came back positive. A ban and a savaging in the press.' },
  'ev.mysterious_substance.hl.caught': { ru: 'Положительная проба: дисквалификация', en: 'Positive test: banned' },
  'ev.mysterious_substance.res.boost': { ru: 'Вы летаете. Проверки прошли мимо — пока.', en: 'You feel superhuman. The tests missed you — for now.' },
  'ev.mysterious_substance.hl.boost': { ru: 'Невероятный физический прогресс', en: 'An unbelievable physical leap' },
  'ev.mysterious_substance.res.refuse': { ru: 'Вы сказали нет и больше об этом не говорили.', en: 'You said no and never spoke of it again.' },
  'ev.mysterious_substance.res.report': { ru: 'Врача убрали. В раздевалке на вас смотрят иначе.', en: 'The doctor was removed. The dressing room looks at you differently.' },
  'ev.mysterious_substance.hl.report': { ru: 'Скандал: игрок сдал клубного врача', en: 'Scandal: player reports club doctor' },

  // ─── doping_shadow ────────────────────────────────────────────────────────
  'ev.doping_shadow.title': { ru: 'Старая история всплыла', en: 'An old story resurfaces' },
  'ev.doping_shadow.body': {
    ru: 'Журналист раскопал ту историю с препаратом и просит комментарий до выхода материала.',
    en: 'A journalist dug up the substance story and wants a comment before publication.',
  },
  'ev.doping_shadow.opt.deny': { ru: 'Всё отрицать', en: 'Deny everything' },
  'ev.doping_shadow.opt.admit': { ru: 'Признать', en: 'Admit it' },
  'ev.doping_shadow.res.exposed': { ru: 'Нашлись документы. Отрицать было худшим решением.', en: 'Documents surfaced. Denial was the worst option.' },
  'ev.doping_shadow.hl.exposed': { ru: 'Документы подтвердили: ложь раскрыта', en: 'Documents confirm it: the denial collapses' },
  'ev.doping_shadow.res.buried': { ru: 'Материал вышел без доказательств и быстро забылся.', en: 'The piece ran without proof and faded fast.' },
  'ev.doping_shadow.res.admit': { ru: 'Признание стоило вам трибун, но закрыло тему.', en: 'The confession cost you the stands but closed the subject.' },
  'ev.doping_shadow.hl.admit': { ru: 'Публичное признание закрыло старую историю', en: 'Public confession closes an old story' },

  // ─── academy_finishing_school ─────────────────────────────────────────────
  'ev.academy_finishing_school.title': { ru: 'Дополнительные часы в академии', en: 'Extra hours at the academy' },
  'ev.academy_finishing_school.body': {
    ru: 'Тренер академии предлагает оставаться после занятий. Все остальные уже уходят домой.',
    en: 'The academy coach offers extra work after sessions. Everyone else is already going home.',
  },
  'ev.academy_finishing_school.opt.stay_late': { ru: 'Оставаться каждый вечер', en: 'Stay every evening' },
  'ev.academy_finishing_school.opt.balance': { ru: 'Иногда, чтобы не перегореть', en: 'Sometimes, to keep balance' },
  'ev.academy_finishing_school.res.stay_late': { ru: 'Вы стали лучшим на своём годе. И почти не видите друзей.', en: 'You became the best in your year. And barely see your friends.' },
  'ev.academy_finishing_school.res.balance': { ru: 'Растёте ровно и не ненавидите футбол.', en: 'You grow steadily and still love the game.' },

  // ─── injury_hit ───────────────────────────────────────────────────────────
  'ev.injury_hit.title': { ru: 'Травма', en: 'Injury' },
  'ev.injury_hit.body': {
    ru: 'Диагноз: {kind}. Врач называет сроки, вы прикидываете, что готовы потерять.',
    en: 'Diagnosis: {kind}. The doctor gives you a timeline; you weigh what you are ready to lose.',
  },
  'ev.injury_hit.opt.rush': { ru: 'Вернуться раньше срока', en: 'Come back early' },
  'ev.injury_hit.opt.protocol': { ru: 'По протоколу', en: 'Follow the protocol' },
  'ev.injury_hit.opt.specialist': { ru: 'Ехать к специалисту', en: 'See a specialist' },
  'ev.injury_hit.res.relapse': { ru: 'Рецидив на первой же неделе. Теперь всё серьёзнее.', en: 'A relapse in the first week. Now it is worse than before.' },
  'ev.injury_hit.hl.relapse': { ru: 'Рецидив после раннего возвращения', en: 'Relapse after an early return' },
  'ev.injury_hit.res.rushed_ok': { ru: 'Рискнули и успели. Тренер и трибуны это оценили.', en: 'You gambled and made it. The coach and the stands noticed.' },
  'ev.injury_hit.res.specialist': { ru: 'Специалист сократил сроки почти вдвое. Дорого, но работает.', en: 'The specialist nearly halved the timeline. Expensive, but it works.' },
  'ev.injury_hit.res.protocol': { ru: 'Прошли восстановление честно, без сюрпризов.', en: 'You did the rehab properly, no surprises.' },

  // ─── injury_at_peak ───────────────────────────────────────────────────────
  'ev.injury_at_peak.title': { ru: 'Играть на уколах', en: 'Play through it' },
  'ev.injury_at_peak.body': {
    ru: 'У {club} концовка сезона, а у вас надрыв. Можно играть через боль, можно лечиться.',
    en: '{club} are in the run-in and you are carrying a tear. Play through the pain, or heal.',
  },
  'ev.injury_at_peak.opt.play': { ru: 'Выйти на поле', en: 'Take the field' },
  'ev.injury_at_peak.opt.recover': { ru: 'Лечиться', en: 'Get treatment' },
  'ev.injury_at_peak.res.broke': { ru: 'Нога не выдержала на двадцатой минуте. Сезон закончен.', en: 'The leg gave way on twenty minutes. Season over.' },
  'ev.injury_at_peak.hl.broke': { ru: 'Сломался в решающем матче', en: 'Broke down in the decisive match' },
  'ev.injury_at_peak.res.hero': { ru: 'Вы дотащили команду на зубах. Такое не забывают.', en: 'You dragged the team through on sheer will. Nobody forgets that.' },
  'ev.injury_at_peak.hl.hero': { ru: 'Отыграл концовку сезона через боль', en: 'Played the run-in through the pain' },
  'ev.injury_at_peak.res.recover': { ru: 'Вы здоровы к следующему сезону, но концовку команда прошла без вас.', en: 'You are fit for next season, but the team finished the run-in without you.' },

  // ─── surgery_choice ───────────────────────────────────────────────────────
  'ev.surgery_choice.title': { ru: 'Где оперироваться', en: 'Where to have surgery' },
  'ev.surgery_choice.body': {
    ru: 'Нужна операция. Клубная клиника, дорогой хирург за границей или попытка обойтись без ножа.',
    en: 'Surgery is needed. The club clinic, an expensive surgeon abroad, or trying to avoid the knife.',
  },
  'ev.surgery_choice.opt.abroad': { ru: 'Хирург за границей', en: 'Surgeon abroad' },
  'ev.surgery_choice.opt.club': { ru: 'Клубная клиника', en: 'Club clinic' },
  'ev.surgery_choice.opt.conservative': { ru: 'Обойтись без операции', en: 'Avoid the knife' },
  'ev.surgery_choice.res.abroad': { ru: 'Колено собрали идеально. Счёт тоже впечатляющий.', en: 'The knee was rebuilt perfectly. So was the invoice.' },
  'ev.surgery_choice.res.failed': { ru: 'Без операции не обошлось. Теперь колено будет напоминать о себе всегда.', en: 'The knife was needed after all. The knee will remind you forever.' },
  'ev.surgery_choice.hl.failed': { ru: 'Отказ от операции обернулся хронической травмой', en: 'Avoiding surgery turned chronic' },
  'ev.surgery_choice.res.lucky': { ru: 'Обошлось. Врачи сами удивились.', en: 'You got away with it. The doctors were surprised too.' },
  'ev.surgery_choice.res.club': { ru: 'Стандартная операция, стандартное восстановление.', en: 'A standard operation, a standard recovery.' },

  // ─── chronic_pain ─────────────────────────────────────────────────────────
  'ev.chronic_pain.title': { ru: 'Колено болит каждое утро', en: 'The knee hurts every morning' },
  'ev.chronic_pain.body': {
    ru: 'Врач предлагает блокады: играть можно, но каждый укол — вычет из будущего.',
    en: 'The doctor offers injections: you can play, but each one is a withdrawal from the future.',
  },
  'ev.chronic_pain.opt.injections': { ru: 'Играть на блокадах', en: 'Play on injections' },
  'ev.chronic_pain.opt.manage': { ru: 'Дозировать нагрузку', en: 'Manage the load' },
  'ev.chronic_pain.res.injections': { ru: 'Боли нет, минуты есть. Счёт придёт позже.', en: 'No pain, plenty of minutes. The bill comes later.' },
  'ev.chronic_pain.res.manage': { ru: 'Вы играете меньше, но встаёте утром нормально.', en: 'You play less, but you get up in the morning like a human.' },

  // ─── early_decline ────────────────────────────────────────────────────────
  'ev.early_decline.title': { ru: 'Тело говорит первым', en: 'The body speaks first' },
  'ev.early_decline.body': {
    ru: 'Скорость ушла раньше срока. Можно перестроить игру под голову, можно делать вид, что ничего не изменилось.',
    en: 'The pace went early. You can rebuild your game around your head, or pretend nothing changed.',
  },
  'ev.early_decline.opt.adapt': { ru: 'Перестроить игру', en: 'Rebuild the game' },
  'ev.early_decline.opt.deny': { ru: 'Играть как раньше', en: 'Play as before' },
  'ev.early_decline.res.adapt': { ru: 'Вы стали медленнее и умнее. Второе важнее.', en: 'You got slower and smarter. The second matters more.' },
  'ev.early_decline.res.deny_bad': { ru: 'Ахилл не выдержал попытки быть двадцатилетним.', en: 'The achilles could not carry a twenty-year-old’s ambitions.' },
  'ev.early_decline.hl.deny_bad': { ru: 'Тяжёлая травма после попытки играть по-старому', en: 'Serious injury after refusing to adapt' },
  'ev.early_decline.res.deny_ok': { ru: 'Пока получается. Трибуны рады, врачи нет.', en: 'It is working so far. The stands are happy, the medics are not.' },

  // ─── fitness_warning ─────────────────────────────────────────────────────
  'ev.fitness_warning.title': { ru: 'Красная зона', en: 'Red zone' },
  'ev.fitness_warning.body': {
    ru: 'Показатели восстановления на дне. Врач просит паузу, тренер про паузу слышать не хочет.',
    en: 'Recovery numbers are at the floor. The doctor wants a break; the manager will not hear of it.',
  },
  'ev.fitness_warning.opt.break': { ru: 'Взять паузу', en: 'Take the break' },
  'ev.fitness_warning.opt.push_on': { ru: 'Терпеть', en: 'Push on' },
  'ev.fitness_warning.res.break': { ru: 'Пауза вернула вас к жизни, но место в составе пришлось отдать.', en: 'The break brought you back to life; the shirt went to someone else.' },
  'ev.fitness_warning.res.collapsed': { ru: 'Терпели ровно до надрыва мышцы.', en: 'You pushed on right up to the muscle tearing.' },
  'ev.fitness_warning.hl.collapsed': { ru: 'Доигрался до травмы', en: 'Pushed on until the injury came' },
  'ev.fitness_warning.res.survived': { ru: 'Дотерпели. Тренер запомнил, тело тоже.', en: 'You made it. The manager remembered; so did your body.' },

  // ─── rival_signing ────────────────────────────────────────────────────────
  'ev.rival_signing.title': { ru: 'Конкурент на вашу позицию', en: 'A rival for your shirt' },
  'ev.rival_signing.body': {
    ru: '{club} подписал ещё одного игрока на позицию «{position}». Место в составе больше не ваше по умолчанию.',
    en: '{club} signed another {position}. The shirt is no longer yours by default.',
  },
  'ev.rival_signing.opt.fight': { ru: 'Выигрывать место на поле', en: 'Win the shirt on the pitch' },
  'ev.rival_signing.opt.talk': { ru: 'Поговорить с тренером', en: 'Talk to the manager' },
  'ev.rival_signing.opt.sulk': { ru: 'Обидеться', en: 'Sulk' },
  'ev.rival_signing.res.won_place': { ru: 'Вы выиграли конкуренцию честно, на тренировках и в матчах.', en: 'You won the fight honestly, in training and in games.' },
  'ev.rival_signing.hl.won_place': { ru: 'Выиграл конкуренцию за место', en: 'Won the battle for the shirt' },
  'ev.rival_signing.res.lost_place': { ru: 'Конкурент оказался сильнее. Место потеряно.', en: 'The rival was better. The shirt is gone.' },
  'ev.rival_signing.res.talk': { ru: 'Тренер обозначил роль честно: вы первый, пока играете так.', en: 'The manager was straight with you: you are first choice while you play like this.' },
  'ev.rival_signing.res.sulk': { ru: 'Обида читалась на тренировках. Хуже стало всем, а вам — больше всех.', en: 'The sulk was visible in training. Everyone lost, you most of all.' },

  // ─── young_prospect ───────────────────────────────────────────────────────
  'ev.young_prospect.title': { ru: 'Молодой на вашей позиции', en: 'A youngster in your position' },
  'ev.young_prospect.body': {
    ru: 'Из академии подняли парня, который повторяет ваши движения. Можно помочь, можно закрыть ему дорогу.',
    en: 'A kid came up from the academy copying your movements. You can help him or block his path.',
  },
  'ev.young_prospect.opt.mentor': { ru: 'Взять под крыло', en: 'Take him under your wing' },
  'ev.young_prospect.opt.freeze': { ru: 'Не давать шанса', en: 'Give him nothing' },
  'ev.young_prospect.opt.ask_exit': { ru: 'Просить трансфер', en: 'Ask for a transfer' },
  'ev.young_prospect.res.mentor': { ru: 'Он растёт, вы теряете минуты — и получаете уважение всей раздевалки.', en: 'He grows, you lose minutes — and gain the whole dressing room.' },
  'ev.young_prospect.res.freeze': { ru: 'Минуты вы сохранили. Отношение к вам изменилось.', en: 'You kept your minutes. The way people see you changed.' },
  'ev.young_prospect.res.ask_exit': { ru: 'Вы дали понять, что готовы уйти.', en: 'You made it clear you are ready to leave.' },

  // ─── captain_armband ──────────────────────────────────────────────────────
  'ev.captain_armband.title': { ru: 'Капитанская повязка', en: 'The armband' },
  'ev.captain_armband.body': {
    ru: 'В {club} освободилась повязка, и тренер предлагает её вам.',
    en: 'The armband is free at {club} and the manager is offering it to you.',
  },
  'ev.captain_armband.opt.accept': { ru: 'Принять', en: 'Accept' },
  'ev.captain_armband.opt.decline': { ru: 'Отказаться', en: 'Decline' },
  'ev.captain_armband.res.accept': { ru: 'Вы капитан. Теперь любой провал — тоже ваш.', en: 'You are captain. Every failure is yours now too.' },
  'ev.captain_armband.hl.accept': { ru: 'Получил капитанскую повязку', en: 'Handed the captain’s armband' },
  'ev.captain_armband.res.decline': { ru: 'Вы отказались. Кто-то в раздевалке это запомнил.', en: 'You declined. Someone in the dressing room noted it.' },

  // ─── dressing_room_row ────────────────────────────────────────────────────
  'ev.dressing_room_row.title': { ru: 'Ссора в раздевалке', en: 'A row in the dressing room' },
  'ev.dressing_room_row.body': {
    ru: 'После разбора матча вы сцепились с {name}. В раздевалке тишина и все смотрят на вас.',
    en: 'After the video review you clashed with {name}. The room went quiet and everyone is looking at you.',
  },
  'ev.dressing_room_row.opt.apologise': { ru: 'Извиниться', en: 'Apologise' },
  'ev.dressing_room_row.opt.stand_firm': { ru: 'Стоять на своём', en: 'Stand your ground' },
  'ev.dressing_room_row.opt.go_public': { ru: 'Вынести в прессу', en: 'Take it public' },
  'ev.dressing_room_row.res.apologise': { ru: 'Конфликт закрыт. Вам это стоило самолюбия.', en: 'The row is closed. It cost you your pride.' },
  'ev.dressing_room_row.res.respected': { ru: 'Вас услышали. В раздевалке появился ваш голос.', en: 'They listened. The room now has your voice in it.' },
  'ev.dressing_room_row.res.isolated': { ru: 'Вы остались правы и один.', en: 'You were right, and alone.' },
  'ev.dressing_room_row.res.go_public': { ru: 'История ушла в газеты. Трибунам понравилось, команде нет.', en: 'The story hit the papers. The stands loved it, the squad did not.' },
  'ev.dressing_room_row.hl.go_public': { ru: 'Конфликт в раздевалке вышел в прессу', en: 'Dressing-room row spills into the press' },

  // ─── penalty_duty ─────────────────────────────────────────────────────────
  'ev.penalty_duty.title': { ru: 'Кто бьёт пенальти', en: 'Who takes the penalties' },
  'ev.penalty_duty.body': {
    ru: 'Штатный пенальтист ушёл. Тренер спрашивает, кто берёт мяч.',
    en: 'The regular penalty taker has left. The manager asks who picks up the ball.',
  },
  'ev.penalty_duty.opt.take': { ru: 'Беру я', en: 'I take them' },
  'ev.penalty_duty.opt.pass': { ru: 'Пусть бьёт другой', en: 'Let someone else' },
  'ev.penalty_duty.res.pass': { ru: 'Мяч взял другой. Спокойнее, но и заметности меньше.', en: 'Someone else took the ball. Calmer, and less visible.' },
  'ev.penalty_duty.res.reliable': { ru: 'Вы бьёте надёжно, и это добавляет к вашей статистике каждый сезон.', en: 'You are reliable from the spot, and it pads your numbers every season.' },
  'ev.penalty_duty.res.missed': { ru: 'Промах в важном матче. Мяч у вас забрали.', en: 'A miss in a big game. The ball was taken off you.' },
  'ev.penalty_duty.hl.missed': { ru: 'Промахнулся с пенальти в важном матче', en: 'Missed a penalty in a big game' },

  // ─── teammate_partner ─────────────────────────────────────────────────────
  'ev.teammate_partner.title': { ru: 'Неудобный разговор', en: 'An awkward proposition' },
  'ev.teammate_partner.body': {
    ru: 'Девушка одного из партнёров по команде откровенно с вами флиртует. Отшутиться уже не получится.',
    en: 'The girlfriend of one of your teammates is openly flirting with you. Laughing it off is no longer an option.',
  },
  'ev.teammate_partner.opt.refuse': { ru: 'Отказать', en: 'Say no' },
  'ev.teammate_partner.opt.accept': { ru: 'Согласиться', en: 'Go along with it' },
  'ev.teammate_partner.res.refuse': { ru: 'Вы закрыли тему сразу. Это оказалось правильным.', en: 'You shut it down immediately. That turned out right.' },
  'ev.teammate_partner.res.scandal': { ru: 'Всё вышло наружу. Раздевалка вас вычеркнула.', en: 'It all came out. The dressing room wrote you off.' },
  'ev.teammate_partner.hl.scandal': { ru: 'Скандал внутри команды', en: 'A scandal inside the squad' },
  'ev.teammate_partner.res.quiet': { ru: 'Никто не узнал. Почти никто.', en: 'Nobody found out. Almost nobody.' },

  // ─── bonus_dispute ────────────────────────────────────────────────────────
  'ev.bonus_dispute.title': { ru: 'Спор о премиальных', en: 'The bonus dispute' },
  'ev.bonus_dispute.body': {
    ru: 'Клуб задерживает премии. Команда думает о забастовке и ищет, кто пойдёт говорить.',
    en: 'The club is late with bonuses. The squad is talking about a strike and looking for a spokesman.',
  },
  'ev.bonus_dispute.opt.lead': { ru: 'Говорить за команду', en: 'Speak for the squad' },
  'ev.bonus_dispute.opt.stay_out': { ru: 'Не вмешиваться', en: 'Stay out of it' },
  'ev.bonus_dispute.opt.side_board': { ru: 'Договориться отдельно', en: 'Cut your own deal' },
  'ev.bonus_dispute.res.lead': { ru: 'Премии выплатили. Руководство запомнило, кто это устроил.', en: 'The bonuses were paid. The board remembered who organised it.' },
  'ev.bonus_dispute.hl.lead': { ru: 'Вывел команду на разговор с клубом', en: 'Led the squad against the club' },
  'ev.bonus_dispute.res.side_board': { ru: 'Вы получили своё. Команда узнала об этом на следующий день.', en: 'You got yours. The squad found out the next day.' },
  'ev.bonus_dispute.res.stay_out': { ru: 'Вы остались в стороне, и это тоже позиция.', en: 'You stayed out of it, which is also a position.' },

  // ─── new_manager ──────────────────────────────────────────────────────────
  'ev.new_manager.title': { ru: 'Новый тренер', en: 'A new manager' },
  'ev.new_manager.body': {
    ru: 'Клуб возглавил {name}. Его футбол — это {style}, и вашу позицию он видит по-своему.',
    en: '{name} has taken over. His football is {style}, and he sees your position his own way.',
  },
  'ev.new_manager.opt.adapt': { ru: 'Подстроиться под схему', en: 'Adapt to the system' },
  'ev.new_manager.opt.insist': { ru: 'Настаивать на своей роли', en: 'Insist on your role' },
  'ev.new_manager.opt.seek_exit': { ru: 'Искать выход', en: 'Look for the exit' },
  'ev.new_manager.res.adapt': { ru: 'Вы выучили новые требования и попали в план тренера.', en: 'You learned the new demands and made it into his plans.' },
  'ev.new_manager.res.insist_ok': { ru: 'Тренер согласился попробовать по-вашему — и это сработало.', en: 'The manager agreed to try it your way — and it worked.' },
  'ev.new_manager.res.insist_bad': { ru: 'Тренер услышал вас и посадил на скамейку.', en: 'The manager heard you out and put you on the bench.' },
  'ev.new_manager.res.seek_exit': { ru: 'Вы дали агенту зелёный свет.', en: 'You gave your agent the green light.' },
}
