'use strict';

var WEEK_DAYS = {
    'ПН': 1,
    'ВТ': 2,
    'СР': 3
};
var MS_IN_MIN = 1000 * 60;
var MS_IN_HOUR = MS_IN_MIN * 60;
var TODAY = new Date();
var BEGIN_MONDAY = new Date(TODAY.getFullYear(), TODAY.getMonth(),
    WEEK_DAYS['ПН'], 0, 0).getTime();
var END_WEDNESDAY = new Date(TODAY.getFullYear(), TODAY.getMonth(),
    WEEK_DAYS['СР'], 23, 59).getTime();

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
// exports.isStar = true;
exports.isStar = true;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var bankTimezone = getTimezone(workingHours.from);
    var timeIntervals = parseShedule(schedule).map(function (interval) {
        return toBankTimezone(interval, bankTimezone);
    });
    timeIntervals = timeIntervals.concat(getBankNotWorkingTime(workingHours));
    timeIntervals = timeIntervals.concat([
        {
            from: BEGIN_MONDAY,
            to: BEGIN_MONDAY
        },
        {
            from: END_WEDNESDAY,
            to: END_WEDNESDAY
        }
    ]);
    timeIntervals = intersectionTimeIntervals(timeIntervals);
    var lastMoment = getRobberyMoment(timeIntervals, duration);

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            if (!lastMoment) {
                return false;
            }

            return true;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {
                return '';
            }
            var day = new Date(lastMoment).getDate();
            var hours = ('0' + new Date(lastMoment).getHours()).slice(-2);
            var minutes = ('0' + new Date(lastMoment).getMinutes()).slice(-2);
            var weekDays = Object.keys(WEEK_DAYS);
            var textDay = weekDays.filter(function (weekDay) {
                return WEEK_DAYS[weekDay] === day;
            })[0];

            return template
                .replace(/(%DD)/, textDay)
                .replace(/(%HH)/, hours)
                .replace(/(%MM)/, minutes);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var lastTruMoment = lastMoment;
            timeIntervals.push(
                {
                    from: BEGIN_MONDAY,
                    to: lastMoment + 30 * MS_IN_MIN
                }
            );
            timeIntervals = intersectionTimeIntervals(timeIntervals);
            if (getRobberyMoment(timeIntervals, duration)) {
                lastMoment = getRobberyMoment(timeIntervals, duration);
            }
            if (lastTruMoment === lastMoment) {
                return false;
            }

            return true;
        }
    };
};
function toBankTimezone(interval, templateTimezone) {
    var deltaZone = templateTimezone - interval.timezone;

    return {
        from: interval.from + deltaZone * MS_IN_HOUR,
        to: interval.to + deltaZone * MS_IN_HOUR
    };
}
function parseShedule(schedule) {
    var intervals = [];
    Object.keys(schedule).forEach(function (name) {
        schedule[name].forEach(function (obj) {
            intervals.push(
                {
                    from: toDate(obj.from),
                    to: toDate(obj.to),
                    timezone: getTimezone(obj.from)
                }
            );
        });
    });

    return intervals;
}
function toDate(timeString) {
    var matches = timeString.match(/^([А-Я]{2})\s(\d{2}):(\d{2})/);
    var day = WEEK_DAYS[matches[1]];
    var hours = parseInt(matches[2]);
    var minutes = parseInt(matches[3]);
    var date = new Date(TODAY.getFullYear(), TODAY.getMonth(), day, hours, minutes).getTime();

    return date;
}
function getTimezone(timeString) {
    return parseInt(timeString.match(/\+(\d{1,2})$/)[1]);
}
function getRobberyMoment(intervals, duration) {
    for (var i = 0; i < intervals.length - 1; i++) {
        var firstInterval = intervals[i];
        var secondInterval = intervals[i + 1];
        var durationInterval = {
            from: firstInterval.to,
            to: firstInterval.to + (duration - 1) * MS_IN_MIN
        };
        if (durationInterval.to < secondInterval.from &&
            durationInterval.to <= END_WEDNESDAY && durationInterval.from >= BEGIN_MONDAY &&
            new Date(durationInterval.to).getDate() === new Date(durationInterval.from).getDate()) {

            return durationInterval.from;
        }
    }

    return null;
}
function intersectionTimeIntervals(intervals) {
    intervals.sort(function (a, b) {
        return a.from - b.from;
    });
    var firstInterval = intervals[0];
    var secondInterval = intervals[1];
    var resultIntervals = [];
    var currentIntervalIndex = 1;
    while (firstInterval.to !== intervals[intervals.length - 1].to &&
        currentIntervalIndex !== intervals.length) {
        currentIntervalIndex++;
        if (firstInterval.to >= secondInterval.from && firstInterval.to <= secondInterval.to) {
            firstInterval.to = secondInterval.to;
        } else if (firstInterval.to >= BEGIN_MONDAY - MS_IN_MIN &&
            firstInterval.from <= END_WEDNESDAY + MS_IN_MIN &&
            firstInterval.to <= secondInterval.to) {
            resultIntervals.push(firstInterval);
            firstInterval = intervals[currentIntervalIndex - 1];
        } else if (firstInterval.to <= secondInterval.to) {
            firstInterval = intervals[currentIntervalIndex - 1];
        }
        secondInterval = intervals[currentIntervalIndex];
    }
    resultIntervals.push(firstInterval);

    return resultIntervals;
}
function getBankNotWorkingTime(workingHours) {
    var weekDays = Object.keys(WEEK_DAYS);
    var relaxIntervals = [];
    weekDays.forEach(function (day) {
        var workingDates = {
            from: toDate(day + ' ' + workingHours.from),
            to: toDate(day + ' ' + workingHours.to)
        };
        var leftDayBorder = new Date(BEGIN_MONDAY)
            .setDate(WEEK_DAYS[day]);
        var rightDayBorder = new Date(END_WEDNESDAY)
            .setDate(WEEK_DAYS[day]);
        if (workingDates.from - leftDayBorder !== 0) {
            var to = workingDates.from;
            relaxIntervals.push({
                from: leftDayBorder,
                to: to
            });
        }
        if (rightDayBorder - workingDates.to !== 0) {
            var from = workingDates.to;
            relaxIntervals.push({
                from: from,
                to: rightDayBorder
            });
        }
    });

    return relaxIntervals;
}
