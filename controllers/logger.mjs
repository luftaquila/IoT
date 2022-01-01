import dateformat from 'dateformat'
import clc from 'cli-color'

const logger = (method, level, message) => {
  console.log(`${clc.white(dateformat(new Date(), 'yyyy-mm-dd HH:MM:ss'))} ${clc.cyan(`[${method}]`)}${clc.red(`[${level}]`)} ${message}`);
}

export default logger