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
    var timeIntervals = parseShedule(schedule).map(function (interval) {
        return toBankTimezone(interval, bankTimezone);
    });
    timeIntervals = timeIntervals.concat(getBankNotWorkingTime(workingHours));
    timeIntervals = timeIntervals.concat([
        {
            from: BEGIN_MONDAY - MS_IN_MIN,
            to: BEGIN_MONDAY - MS_IN_MIN
        },
        {
            from: END_WEDNESDAY + MS_IN_MIN,
            to: END_WEDNESDAY + MS_IN_MIN
        }
    ]);
    var foundMoments = getRobberyMoments(timeIntervals, duration);
    var lastMoment = foundMoments[0];

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
            var textDay = Object.keys(WEEK_DAYS).filter(function (weekDay) {
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
            foundMoments.splice(0, 1);
            if (foundMoments[0]) {
                lastMoment = foundMoments[0];
            }
            if (!foundMoments[0]) {
                return false;
            }

            return true;
        }
    };
};
function toBankTimezone(interval, bankTimezone) {
    var deltaZone = bankTimezone - interval.timezone;

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
                    from: toDate(obj.from) + MS_IN_MIN,
                    to: toDate(obj.to) - MS_IN_MIN,
                    timezone: getTimezone(obj.from)
                }
            );
        });
    });

    return intervals;
}
function toDate(timeString) {
    var parsedTime = timeString.match(/^([А-Я]{2})\s(\d{2}):(\d{2})/);
    var day = WEEK_DAYS[parsedTime[1]];
    var hours = parseInt(parsedTime[2], 10);
    var minutes = parseInt(parsedTime[3], 10);

    return new Date(TODAY.getFullYear(), TODAY.getMonth(), day, hours, minutes).getTime();
}
function getTimezone(timeString) {
    return parseInt(timeString.match(/\+(\d{1,2})$/)[1], 10);
}
function isLessThan(duration, secondInterval) {
    if (duration.to < secondInterval.from && duration.to <= END_WEDNESDAY &&
        duration.from >= BEGIN_MONDAY && isCommonDay(duration.to, duration.from)) {
        return true;
    }

    return false;
}
function getDurationInterval(endInterval, duration) {
    return {
        from: endInterval + MS_IN_MIN,
        to: endInterval + (duration + 1) * MS_IN_MIN
    };
}
function getRobberyMoments(intervals, duration) {
    intervals = intersectionTimeIntervals(intervals);
    var moments = [];
    for (var i = 0; i < intervals.length - 1; i++) {
        var firstInterval = intervals[i];
        var secondInterval = intervals[i + 1];
        var durationInterval = getDurationInterval(firstInterval.to, duration);
        while (isLessThan(durationInterval, secondInterval)) {
            moments.push(durationInterval.from);
            var nextRightLimit = durationInterval.from + (TIME_INDENT - 1) * MS_IN_MIN;
            durationInterval = getDurationInterval(nextRightLimit, duration);
        }
    }

    return moments;
}
function isCommonDay(firstDate, secondDate) {
    return new Date(firstDate).getDate() === new Date(secondDate).getDate();
}
function isInLimit(interval) {
    return interval.to >= BEGIN_MONDAY - MS_IN_MIN &&
        interval.from <= END_WEDNESDAY + MS_IN_MIN;
}
function intersectionTimeIntervals(intervals) {
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
