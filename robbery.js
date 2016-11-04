'use strict';

var WEEK_DAYS = {
    'ПН': 1,
    'ВТ': 2,
    'СР': 3
};
var MS_IN_MIN = 1000 * 60;
var MS_IN_HOUR = MS_IN_MIN * 60;
var TODAY = new Date();
var BEGIN_MONDAY = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1, 0, 0).getTime();
var END_WEDNESDAY = new Date(TODAY.getFullYear(), TODAY.getMonth(), 3, 23, 59).getTime();
var TIME_INDENT = 30;

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
    var timeIntervals = parseShedule(schedule, bankTimezone);
    timeIntervals = timeIntervals.concat(
        getBankNotWorkingTime(workingHours),
        [
            {
                from: BEGIN_MONDAY - MS_IN_MIN,
                to: BEGIN_MONDAY - MS_IN_MIN
            },
            {
                from: END_WEDNESDAY + MS_IN_MIN,
                to: END_WEDNESDAY + MS_IN_MIN
            }
        ]
    );
    var foundMoments = getRobberyMoments(timeIntervals, duration);
    var indexLastMomet = 0;
    var lastMoment = foundMoments[0];

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return Boolean(lastMoment);
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
            var hours = toTimeFormat(new Date(lastMoment).getHours());
            var minutes = toTimeFormat(new Date(lastMoment).getMinutes());
            var textDay = Object.keys(WEEK_DAYS).filter(function (weekDay) {
                return WEEK_DAYS[weekDay] === day;
            })[0];

            return template
                .replace('%DD', textDay)
                .replace('%HH', hours)
                .replace('%MM', minutes);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            indexLastMomet++;
            if (!foundMoments[indexLastMomet]) {
                return false;
            }
            lastMoment = foundMoments[indexLastMomet];

            return true;
        }
    };
};
function toTimeFormat(number) {
    return ('0' + number).slice(-2);
}
function toBaseTimezone(interval, baseTimezone) {
    var deltaZone = baseTimezone - interval.timezone;

    return {
        from: interval.from + deltaZone * MS_IN_HOUR,
        to: interval.to + deltaZone * MS_IN_HOUR
    };
}
function parseShedule(schedule, baseTimezone) {
    return Object.keys(schedule).reduce(function (acc, name) {
        var friendShedule = schedule[name].map(function (obj) {
            return {
                from: toDate(obj.from) + MS_IN_MIN,
                to: toDate(obj.to) - MS_IN_MIN,
                timezone: getTimezone(obj.from)
            };
        });
        acc = acc.concat(friendShedule);

        return acc;
    }, [])
    .map(function (interval) {
        return toBaseTimezone(interval, baseTimezone);
    });
}
function toDate(timeString) {
    var parsedTime = timeString.match(/^(ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)\s(\d{2}):(\d{2})/);
    var day = WEEK_DAYS[parsedTime[1]];
    var hours = parseInt(parsedTime[2], 10);
    var minutes = parseInt(parsedTime[3], 10);

    return new Date(TODAY.getFullYear(), TODAY.getMonth(), day, hours, minutes).getTime();
}
function getTimezone(timeString) {
    return parseInt(parseInt(timeString.split('+')[1]), 10);
}
function isLessThan(firstInterval, secondInterval) {
    if (firstInterval.to < secondInterval.from && firstInterval.to <= END_WEDNESDAY &&
        firstInterval.from >= BEGIN_MONDAY && isSameDay(firstInterval.to, firstInterval.from)) {
        return true;
    }

    return false;
}
function getDurationInterval(from, duration) {
    return {
        from: from + MS_IN_MIN,
        to: from + (duration + 1) * MS_IN_MIN
    };
}
function getRobberyMoments(intervals, duration) {
    intervals = getMergingIntervals(intervals);
    var moments = [];
    for (var i = 0; i < intervals.length - 1; i++) {
        var firstInterval = intervals[i];
        var secondInterval = intervals[i + 1];
        var candidateInterval = getDurationInterval(firstInterval.to, duration);
        while (isLessThan(candidateInterval, secondInterval)) {
            moments.push(candidateInterval.from);
            var nextRightLimit = candidateInterval.from + (TIME_INDENT - 1) * MS_IN_MIN;
            candidateInterval = getDurationInterval(nextRightLimit, duration);
        }
    }

    return moments;
}
function isSameDay(firstDate, secondDate) {
    return new Date(firstDate).getDate() === new Date(secondDate).getDate();
}
function isInLimit(interval) {
    return interval.to >= BEGIN_MONDAY - MS_IN_MIN &&
        interval.from <= END_WEDNESDAY + MS_IN_MIN;
}
function getMergingIntervals(intervals) {
    intervals.sort(function (a, b) {
        return a.from - b.from;
    });
    var firstInterval = intervals[0];
    var secondInterval = intervals[1];
    var resultIntervals = [];
    var currentIntervalIndex = 1;
    while (currentIntervalIndex !== intervals.length) {
        currentIntervalIndex++;
        if (isInLimit(firstInterval) && firstInterval.to <= secondInterval.to) {
            resultIntervals.push(firstInterval);
        }
        if (firstInterval.to <= secondInterval.to) {
            firstInterval = secondInterval;
        }
        secondInterval = intervals[currentIntervalIndex];
    }
    resultIntervals.push(firstInterval);

    return resultIntervals;
}
function getBankWorkingDate(workingHours, day) {
    return {
        from: toDate(day + ' ' + workingHours.from),
        to: toDate(day + ' ' + workingHours.to)
    };
}
function getBankNotWorkingTime(workingHours) {
    var resultIntervals = [];
    Object.keys(WEEK_DAYS).forEach(function (day) {
        var workingDates = getBankWorkingDate(workingHours, day);
        var leftDayBorder = new Date(BEGIN_MONDAY).setDate(WEEK_DAYS[day]);
        var rightDayBorder = new Date(END_WEDNESDAY).setDate(WEEK_DAYS[day]);
        var leftNotWorkingInterval = { from: leftDayBorder, to: workingDates.from - MS_IN_MIN };
        var rightNotWorkingInterval = { from: workingDates.to + MS_IN_MIN, to: rightDayBorder };
        if (workingDates.from !== leftDayBorder) {
            resultIntervals.push(leftNotWorkingInterval);
        }
        if (rightDayBorder !== workingDates.to) {
            resultIntervals.push(rightNotWorkingInterval);
        }
    });

    return resultIntervals;
}
