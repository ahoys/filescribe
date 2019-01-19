import * as fs from 'fs';
import * as path from 'path';
import { IglobalOptions } from './types';
require.main = process.mainModule;
const appDir = path.dirname(require.main.filename);

// Here we have the default configuration for LogScribe.
const globalOptions: IglobalOptions = {
  dirPath: appDir,
  disabledTags: [],
  filePrefix: 'application',
  maxMsgLength: 8192,
  printConsole: true,
};

// File-regex.
const regex = new RegExp(/^application_.*log/, 'g');

// Maximum size of a log file.
const maxFileSize = 1000000;

// Use these to save some precious microseconds.
const oArr = Object.keys(globalOptions);
const oLen = oArr.length;

/**
 * Reads, validates and returns customized options for a
 * log run.
 * @param {object} options - User generated custom options.
 * @returns {object} - Validated options.
 */
const readLocalOptions = (options: IglobalOptions): IglobalOptions => {
  try {
    const custom: IglobalOptions = {};
    for (let i = 0; i < oLen; i++) {
      custom[oArr[i]] =
        typeof options[oArr[i]] === typeof globalOptions[oArr[i]]
          ? options[oArr[i]]
          : globalOptions[oArr[i]];
    }
    return custom;
  } catch {
    return globalOptions;
  }
};

/**
 * Returns a file path.
 * @param {string} dirPath - A custom or default directory path.
 * @param {string} filePrefix - Prefix for the file.
 * @returns {Promise<string>} - A full absolute filepath.
 */
const getFilePath = (dirPath: string, filePrefix): Promise<string> => {
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
const getFilePathSync = (dirPath: string, filePrefix): string => {
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
 * Prints out a message.
 * @param {string} msg - The message text.
 * @param {string} tag - Tag to be used, if any.
 * @param {Date} date - Date, if any.
 */
export const print = (msg: string, tag: string, date: Date): void => {
  try {
    const pStr = tag && tag !== '' ? `[${tag}]` : '';
    const d = date || new Date();
    const h = ('0' + d.getHours()).slice(-2);
    const m = ('0' + d.getMinutes()).slice(-2);
    if (msg[0] === '!' && msg[1] === '!') {
      // Red.
      console.log(
        '\x1b[31m',
        `${pStr}[${h}:${m}] -\x1b[0m`,
        msg.slice(2, msg.length)
      );
    } else {
      // Default.
      console.log('\x1b[32m', `${pStr}[${h}:${m}] -\x1b[0m`, msg);
    }
  } catch {
    return;
  }
};

/**
 * Creates a log.
 * @param {string} msg - A message to log and print.
 * @param {string} tag - A tag for the message.
 * @param {boolean} doPrint - Whether to print console.log.
 * @param {object} options - Custom options for the execution.
 * @returns {void} - The generated string.
 */
export const log = (
  msg: string,
  tag: string,
  doPrint: boolean,
  options: IglobalOptions
): void => {
  new Promise(() => {
    const opt = options ? readLocalOptions(options) : globalOptions;
    getFilePath(opt.dirPath, opt.filePrefix).then((filepath: string) => {
      if (
        // Empty path means something failed.
        filepath !== '' &&
        !opt.disabledTags.includes('*') &&
        !opt.disabledTags.includes(tag)
      ) {
        let str = '';
        if (tag && tag !== '') {
          str += `[${tag}]\n`;
        }
        const d = new Date();
        str +=
          typeof msg === 'string'
            ? `${d}\n${msg.substr(0, opt.maxMsgLength)}\n\n`
            : `${d}\n${msg}\n\n`;
        fs.appendFile(filepath, str, 'utf8', err => {
          if (doPrint === true || (doPrint === undefined && opt.printConsole)) {
            print(msg, tag, d);
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
 * @returns {void} - The generated string.
 */
export const logSync = (
  msg: string,
  tag: string,
  doPrint: boolean,
  options: IglobalOptions
): void => {
  try {
    const opt = options ? readLocalOptions(options) : globalOptions;
    const filepath = getFilePathSync(opt.dirPath, opt.filePrefix);
    if (
      // Empty path means something failed.
      filepath !== '' &&
      !opt.disabledTags.includes('*') &&
      !opt.disabledTags.includes(tag)
    ) {
      let str = '';
      if (tag && tag !== '') {
        str += `[${tag}]\n`;
      }
      const d = new Date();
      str +=
        typeof msg === 'string'
          ? `${d}\n${msg.substr(0, opt.maxMsgLength)}\n\n`
          : `${d}\n${msg}\n\n`;
      fs.appendFileSync(filepath, str, 'utf8');
      if (doPrint === true || (doPrint === undefined && opt.printConsole)) {
        print(msg, tag, d);
      }
    }
  } catch {
    return;
  }
};

/**
 * Returns the currently active
 * global options.
 * @returns {object} - The current global options.
 */
export const getGlobalOptions = (): IglobalOptions => {
  return globalOptions;
};

/**
 * Overrides either some or all of the global options.
 * @param {object} options - New custom global options.
 * @returns {object} - The current global options after the modification.
 */
export const setGlobalOptions = (options: IglobalOptions): IglobalOptions => {
  try {
    for (let i = 0; i < oLen; i++) {
      if (typeof options[oArr[i]] === typeof globalOptions[oArr[i]]) {
        globalOptions[oArr[i]] = options[oArr[i]];
      }
    }
    return globalOptions;
  } catch {
    return globalOptions;
  }
};

// Used for tests.
export const forTesting = { readLocalOptions, getFilePath, getFilePathSync };

export default log;
