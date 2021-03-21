if (process.argv.length < 3 || !process.argv[2]) {
  console.error('You must provide a data file path as the first script argument')
  console.error('ex: >>> node grades_script my_course_data.json')
  process.exit()
}

const courseDataPath = process.argv[2]

const fs = require('fs');
const courseData = JSON.parse(fs.readFileSync(courseDataPath, 'utf8'));

if (!courseData
  || !courseData.componentWeights
  || !courseData.weeks
) {
  console.error('Invalid JSON data format')
  process.exit()
}

const components = [
  'discussion_forum',
  'written_assignment',
  'learning_journal',
  'graded_quiz',
  'final_exam',
]
const getComponentQuantities = (weeks) => weeks.reduce((result, week) => {
  Object.keys(week).forEach((component) => result[component] = (result[component] || 0) + 1)
  return result
}, {})

const {
  componentWeights,
  weeks,
} = courseData

const componentQuantities = getComponentQuantities(weeks)

const requiredGradeToPass = 73

const unitaryWeights = Object.entries(componentWeights)
  .reduce((result, [component, weight]) => {
    result[component] = weight / componentQuantities[component]
    return result
  }, {})

const formattedUnitaryWeights = Object.entries(unitaryWeights).reduce((result, [component, weight]) => {
  const beautifiedComponent = component.split('_').map((str) => `${str[0].toUpperCase()}${str.slice(1)}`).join(' ')
  return `${result}\n\t- ${beautifiedComponent}: ${weight.toFixed(2)}`
}, '')
console.log(`Components unitary weights:${formattedUnitaryWeights}\n`);

const getWeekAchievedGrade = (week) => {
  return Object.entries(week).reduce((result, [component, grade]) => {
    if (grade === null) {
      return result
    }

    const componentGrade = unitaryWeights[component] * (grade / 100)
    return result + componentGrade
  }, 0)
}
const currentAchievedGrade = weeks.reduce((result, week) => {
  return result += getWeekAchievedGrade(week)
}, 0)

const getWeekAvailableGrade = (week) => {
  return Object.entries(week).reduce((result, [component, grade]) => {
    if (grade !== null) {
      return result
    }

    return result + unitaryWeights[component]
  }, 0)
}
const currentAvailableGrade = weeks.reduce((result, week) => {
  return result += getWeekAvailableGrade(week)
}, 0)

const getIsPastWeek = (week) => Object.entries(week).some(([component, grade]) => grade !== null)

const futureWeeksAvailableGrades = weeks.reduce((result, week, index) => {
  const weekAvailableGrade = getWeekAvailableGrade(week)
  if (!weekAvailableGrade) {
    return result
  }

  const isPastWeek = getIsPastWeek(week)
  if (isPastWeek) {
    return result
  }

  return `${result}\t${index + 1} - ${weekAvailableGrade.toFixed(2)}\n`
}, 'Future weeks available grades:\n')
console.log(futureWeeksAvailableGrades)

console.log(`Your current acumulated grade is: ${currentAchievedGrade.toFixed(2)}`)

const maximumPossibleGrade = currentAchievedGrade + currentAvailableGrade
console.log(`Your maximum possible grade is: ${maximumPossibleGrade.toFixed(2)}`)

if (maximumPossibleGrade < requiredGradeToPass) {
  console.log('Unfortunately there\'s no way for you to pass in this course this term.')
  return
}

const defaultingGradeToPass = requiredGradeToPass - currentAchievedGrade

const averageGradeToPass = (defaultingGradeToPass / currentAvailableGrade) * 100
console.log(`To pass (>= 73), in the next weeks you must maintain an average grade of: ${averageGradeToPass.toFixed(2)}`)
