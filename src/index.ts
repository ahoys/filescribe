import * as fs from 'fs';
import * as path from 'path';
const isTesting = process.env.NODE_ENV === 'testing';
if (!isTesting) {
  require.main = process.mainModule;
}
const appDir = isTesting
  ? path.resolve(__dirname)
  : path.dirname(require && require.main ? require.main.filename : '');

export interface IglobalLogOptions {
  [key: string]: string | string[] | number | boolean;
  dirPath: string;
  disabledTags: string[];
  filePrefix: string;
  maxMsgLength: number;
  printColor: string;
  printConsole: boolean;
}

// Here we have the default configuration for LogScribe.
const globalLogOptions: IglobalLogOptions = {
  dirPath: appDir,
  disabledTags: [],
  filePrefix: 'application',
  maxMsgLength: 8192,
  printColor: '\x1b[32m',
  printConsole: true,
};

// File-regex.
const regex = new RegExp(/^application_.*log/, 'g');

// Maximum size of a log file.
const maxFileSize = 1000000;

/**
 * Reads, validates and returns customized options for a
 * log run.
 * @param {object} options - User generated custom options.
 * @returns {object} - Validated options.
 */
const readLocalLogOptions = (options: IglobalLogOptions): IglobalLogOptions => {
  try {
    const custom: IglobalLogOptions = { ...globalLogOptions };
    Object.keys(options).forEach(key => {
      if (
        typeof options[key] === typeof globalLogOptions[key] &&
        options[key].constructor === globalLogOptions[key].constructor
      ) {
        custom[key] = options[key];
      }
    });
    return custom;
  } catch {
    return globalLogOptions;
  }
};

/**
 * Returns a file path.
 * @param {string} dirPath - A custom or default directory path.
 * @param {string} filePrefix - Prefix for the file.
 * @returns {Promise<string>} - A full absolute filepath.
 */
const getFilePath = (dirPath: string, filePrefix?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const dir = path.resolve(dirPath);
    fs.readdir(dir, (err, items) => {
      if (!err) {
        const r =
          filePrefix === 'application'
            ? regex
            : new RegExp(`^${filePrefix}_.*log`, 'g');
        // Returns e.g. application_2019_01_19_123123123.log.
        const file = items
          .filter(f => f.match(r))
          .find(f => fs.statSync(`${dir}\\${f}`).size < maxFileSize);
        if (file) {
          resolve(`${dir}\\${file}`);
        } else {
          // Generate a filename as no suitable file was found.
          const d = new Date();
          resolve(
            `${dir}\\${filePrefix}_${d.getFullYear()}_${d.getMonth()}_` +
              `${d.getDate()}_${d.getTime()}.log`
          );
        }
      } else {
        // TODO: create folders.
        reject('');
      }
    });
  });
};

/**
 * Returns a file path (synchronized).
 * @param {string} dirPath - A custom or default directory path.
 * @param {string} filePrefix - Prefix for the file.
 * @returns {Promise<string>} - A full absolute filepath.
 */
const getFilePathSync = (
  dirPath: string,
  filePrefix = 'application'
): string => {
  try {
    const dPath = path.resolve(dirPath);
    const items = fs.readdirSync(dPath);
    if (items) {
      const r =
        filePrefix === 'application'
          ? regex
          : new RegExp(`^${filePrefix}_.*log`, 'g');
      // Returns e.g. application_2019_01_19_123123123.log.
      const file = items
        .filter(f => f.match(r))
        .find(f => fs.statSync(`${dPath}\\${f}`).size < maxFileSize);
      if (file) {
        return `${dPath}\\${file}`;
      }
      // Generate a filename as no suitable file was found.
      const d = new Date();
      return (
        `${dPath}\\${filePrefix}_${d.getFullYear()}_${d.getMonth()}_` +
        `${d.getDate()}_${d.getTime()}.log`
      );
    }
    return '';
  } catch {
    return '';
  }
};

/**
 * Returns a string that is formatted for logging.
 * @param {any} msg - A message to be logged.
 * @param {Date} date - Datetime of the log.
 * @param {string} tag - A tag of the log, if any.
 * @param {IglobalLogOptions} options - Custom options, if any.
 */
export const getLogStr = (
  msg: any,
  date: Date,
  tag?: string,
  options?: IglobalLogOptions
): string => {
  try {
    let str = '';
    // Attach tag.
    if (typeof tag === 'string' && tag !== '') {
      str += `[${tag}]\n`;
    }
    // Attach date.
    str += `[${date}]\n`;
    // Attach message.
    str +=
      typeof msg === 'string'
        ? `${msg.substr(0, options ? options.maxMsgLength : 8192)}\n\n`
        : `${msg}\n\n`;
    // Return the result.
    return str;
  } catch {
    return '';
  }
};

/**
 * Prints out a message.
 * @param {any} msg - The message text.
 * @param {string} tag - Tag to be used, if any.
 * @param {IglobalLogOptions} options - Custom options, if any.
 * @param {Date} date - Date, if any.
 */
export const print = (
  msg: any,
  tag?: string,
  options?: IglobalLogOptions,
  date?: Date
): void => {
  try {
    const opt = options ? readLocalLogOptions(options) : globalLogOptions;
    const pStr = tag && tag !== '' ? `[${tag}]` : '';
    const d = date || new Date();
    const h = ('0' + d.getHours()).slice(-2);
    const m = ('0' + d.getMinutes()).slice(-2);
    const s = ('0' + d.getSeconds()).slice(-2);
    console.log(`${opt.printColor}${pStr}[${h}:${m}:${s}] -\x1b[0m`, msg);
  } catch {
    console.log('');
  }
};

/**
 * Creates a log.
 * @param {string} msg - A message to log and print.
 * @param {string} tag - A tag for the message.
 * @param {boolean} doPrint - Whether to print console.log.
 * @param {object} options - Custom options for the execution.
 */
export const log = (
  msg: string,
  tag: string,
  doPrint: boolean,
  options: IglobalLogOptions
): void => {
  new Promise(() => {
    const opt = options ? readLocalLogOptions(options) : globalLogOptions;
    getFilePath(opt.dirPath || '', opt.filePrefix).then((filepath: string) => {
      if (
        // Empty path means something failed.
        filepath !== '' &&
        opt &&
        opt.disabledTags &&
        !opt.disabledTags.includes('*') &&
        !opt.disabledTags.includes(tag)
      ) {
        const date = new Date();
        fs.appendFile(filepath, getLogStr(msg, date, tag, opt), 'utf8', err => {
          if (doPrint === true || (doPrint === undefined && opt.printConsole)) {
            print(msg, tag, opt, date);
          }
        });
      }
    });
  });
};

/**
 * Creates a log (synchronized).
 * @param {string} msg - A message to log and print.
 * @param {string} tag - A tag for the message.
 * @param {boolean} doPrint - Whether to print console.log.
 * @param {object} options - Custom options for the execution.
 */
export const logSync = (
  msg: string,
  tag: string,
  doPrint: boolean,
  options: IglobalLogOptions
): void => {
  try {
    const opt = options ? readLocalLogOptions(options) : globalLogOptions;
    const filepath = getFilePathSync(opt.dirPath || '', opt.filePrefix);
    if (
      // Empty path means something failed.
      filepath !== '' &&
      opt &&
      opt.disabledTags &&
      !opt.disabledTags.includes('*') &&
      !opt.disabledTags.includes(tag)
    ) {
      const date = new Date();
      fs.appendFileSync(filepath, getLogStr(msg, date, tag, opt), 'utf8');
      if (doPrint === true || (doPrint === undefined && opt.printConsole)) {
        print(msg, tag, opt, date);
      }
    }
  } catch {
    return;
  }
};

/**
 * Returns the currently active
 * global log options.
 * @returns {object} - The current global log options.
 */
export const getGlobalLogOptions = (): IglobalLogOptions => {
  return { ...globalLogOptions };
};

/**
 * Overrides either some or all of the global log options.
 * @param {object} options - New custom global log options.
 * @returns {object} - The current global log options after the modification.
 */
export const setGlobalLogOptions = (
  options: IglobalLogOptions
): IglobalLogOptions => {
  try {
    Object.keys(options).forEach(key => {
      if (typeof options[key] === typeof globalLogOptions[key]) {
        globalLogOptions[key] = options[key];
      }
    });
    return { ...globalLogOptions };
  } catch {
    return { ...globalLogOptions };
  }
};

/**
 * Sets global log setting: dirPath.
 * @param {string} value
 */
export const setDirPath = (value: string): void => {
  try {
    globalLogOptions.dirPath = String(value);
  } catch {
    return;
  }
};

/**
 * Sets global log setting: disabledTags.
 * @param {string[]} value
 */
export const setDisabledTags = (value: string[]): void => {
  try {
    if (typeof value === 'object' && value.constructor === Array) {
      globalLogOptions.disabledTags = value;
    }
  } catch {
    return;
  }
};

/**
 * Sets global log setting: filePrefix.
 * @param {string} value
 */
export const setFilePrefix = (value: string): void => {
  try {
    globalLogOptions.filePrefix = String(value);
  } catch {
    return;
  }
};

/**
 * Sets global log setting: maxMsgLength.
 * @param {number} value
 */
export const setMaxMsgLength = (value: number): void => {
  try {
    globalLogOptions.maxMsgLength = Number(value);
  } catch {
    return;
  }
};

/**
 * Sets global log setting: printColor.
 * @param {string} value
 */
export const setPrintColor = (value: string): void => {
  try {
    globalLogOptions.printColor = String(value);
  } catch {
    return;
  }
};

/**
 * Sets global log setting: printConsole.
 * @param {boolean} value
 */
export const setPrintConsole = (value: boolean): void => {
  try {
    globalLogOptions.printConsole = Boolean(value);
  } catch {
    return;
  }
};

// Used for tests.
export const testUtil = (): any => {
  return isTesting
    ? {
        getFilePath,
        getFilePathSync,
        globalLogOptions,
        readLocalLogOptions,
      }
    : {};
};

export default log;
