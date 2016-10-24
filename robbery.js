'use strict';

var WEEK_DAYS_DICTIONARY = {
    'ПН': 10,
    'ВТ': 11,
    'СР': 12
};
var CONST_YEAR = 2016;
var CONST_MONTH = 9;
var LEFT_BORDER = new Date(CONST_YEAR, CONST_MONTH, WEEK_DAYS_DICTIONARY['ПН'], 0, 0);
var RIGHT_BORDER = new Date(CONST_YEAR, CONST_MONTH, WEEK_DAYS_DICTIONARY['СР'], 23, 59);

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
// exports.isStar = true;
exports.isStar = false;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var generalTimezone = workingHours.from.match(/\+(\d{1,2})/)[1];
    var intersectionIntervals = getNoFreeTime(schedule, generalTimezone);
    intersectionIntervals = intersectionTimeIntervals(intersectionIntervals
        .concat(getBankRelaxTime(workingHours))
    );
    var findedMoments = [];
    for (var i = 0; i < intersectionIntervals.length - 1; i++) {
        var firstInterval = clone(intersectionIntervals[i]);
        var secondIntervalFrom = new Date(intersectionIntervals[i + 1].from);
        var durationInterval = {
            from: addMinuteToDate(firstInterval.to, + 1),
            to: addMinuteToDate(firstInterval.to, duration + 1)
        };
        if (durationInterval.to < secondIntervalFrom &&
            durationInterval.to <= RIGHT_BORDER && durationInterval.from >= LEFT_BORDER) {
            findedMoments.push(getFindedMoment(intersectionIntervals, durationInterval));
            i = -1;
            intersectionIntervals = intersectionTimeIntervals(intersectionIntervals);
        }
        if (!findedMoments[findedMoments.length - 1]) {
            findedMoments.pop();
        }
    }

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            if (!findedMoments.length) {
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
            var day = findedMoments[0].getDate();
            var hours = ('0' + findedMoments[0].getHours()).slice(-2);
            var minutes = ('0' + findedMoments[0].getMinutes()).slice(-2);
            var weekDays = Object.keys(WEEK_DAYS_DICTIONARY);
            var textDay = weekDays.filter(function (weekDay) {
                return WEEK_DAYS_DICTIONARY[weekDay] === day;
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
            if (!this.exists()) {
                return false;
            }
            if (findedMoments.length !== 1) {
                findedMoments.splice(0, 1);
            }

            return true;
        }
    };
};
function getNoFreeTime(schedule, generalTimezone) {
    var noFreeIntervals = [];
    Object.keys(schedule).forEach(function (name) {
        schedule[name].forEach(function (fromToObject) {
            noFreeIntervals.push(
                {
                    from: addMinuteToDate(dateToNewTimezone(fromToObject.from, generalTimezone), 1),
                    to: addMinuteToDate(dateToNewTimezone(fromToObject.to, generalTimezone), -1)
                }
            );
        });
    });

    return noFreeIntervals;
}
function getFindedMoment(intervals, duration) {
    var moment = null;
    if (new Date(duration.to).getDate() ===
    new Date(duration.from).getDate()) {

        moment = new Date(duration.from);
        intervals.push(
            {
                from: new Date(LEFT_BORDER),
                to: addMinuteToDate(duration.from, + 30 - 1)
            }
        );
    } else {
        intervals.push(
            {
                from: new Date(LEFT_BORDER),
                to: addMinuteToDate(duration.from, 0)
            }
        );
    }

    return moment;
}
function addMinuteToDate(date, minutes) {
    return new Date(new Date(date).setMinutes(new Date(date).getMinutes() + minutes));
}
function clone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = obj[attr];
        }
    }

    return copy;
}

function dateToNewTimezone(timeString, templateTimezone) {
    var date = toDate(timeString);
    var timezone = parseInt(timeString.match(/\+(\d{1,2})$/)[1]);
    date.setHours(date.getHours() + (templateTimezone - timezone));

    return date;
}
function toDate(timeString) {
    var matches = timeString.match(/^([А-Я]{2})\s(\d{2}):(\d{2})/);
    var day = WEEK_DAYS_DICTIONARY[matches[1]];
    var hours = parseInt(matches[2]);
    var minutes = parseInt(matches[3]);
    var date = new Date(CONST_YEAR, CONST_MONTH, day, hours, minutes);

    return date;
}
function intersectionTimeIntervals(intervals) {
    intervals = intervals.concat([
        {
            from: addMinuteToDate(LEFT_BORDER, -1),
            to: addMinuteToDate(LEFT_BORDER, -1)
        },
        {
            from: addMinuteToDate(RIGHT_BORDER, 1),
            to: addMinuteToDate(RIGHT_BORDER, 1)
        }
    ]).sort(function (a, b) {
        return a.from - b.from;
    });
    var firstInterval = clone(intervals[0]);
    var secondInterval = clone(intervals[1]);
    var resultIntervals = [];
    var currentIntervalIndex = 1;
    while (firstInterval.to !== intervals[intervals.length - 1].to &&
        currentIntervalIndex !== intervals.length) {
        currentIntervalIndex++;
        if (firstInterval.to >= secondInterval.from && firstInterval.to <= secondInterval.to) {
            firstInterval.to = new Date(secondInterval.to);
        } else if (firstInterval.to >= addMinuteToDate(LEFT_BORDER, -1) &&
            firstInterval.from <= addMinuteToDate(RIGHT_BORDER, 1) &&
            firstInterval.to <= secondInterval.to) {
            resultIntervals.push(firstInterval);
            firstInterval = clone(intervals[currentIntervalIndex - 1]);
        } else if (firstInterval.to <= secondInterval.to) {
            firstInterval = clone(intervals[currentIntervalIndex - 1]);
        }
        secondInterval = clone(intervals[currentIntervalIndex]);
    }
    resultIntervals.push(firstInterval);
    // console.log(resultIntervals);

    return resultIntervals;
}
function getBankRelaxTime(workingHours) {
    var weekDays = Object.keys(WEEK_DAYS_DICTIONARY);
    var relaxIntervals = [];
    weekDays.forEach(function (day) {
        var workingDates = {
            from: toDate(day + ' ' + workingHours.from),
            to: toDate(day + ' ' + workingHours.to)
        };
        var leftDayBorder = new Date(LEFT_BORDER);
        var rightDayBorder = new Date(RIGHT_BORDER);
        leftDayBorder.setDate(WEEK_DAYS_DICTIONARY[day]);
        rightDayBorder.setDate(WEEK_DAYS_DICTIONARY[day]);
        if (workingDates.from - leftDayBorder !== 0) {
            var to = workingDates.from.setMinutes(workingDates.from.getMinutes() - 1);
            relaxIntervals.push({
                from: new Date(leftDayBorder),
                to: new Date(to)
            });
        }
        if (rightDayBorder - workingDates.to !== 0) {
            var from = workingDates.to.setMinutes(workingDates.to.getMinutes() + 1);
            relaxIntervals.push({
                from: new Date(from),
                to: new Date(rightDayBorder)
            });
        }
    });

    return relaxIntervals;
}
