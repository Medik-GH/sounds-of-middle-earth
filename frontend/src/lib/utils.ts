// import chalk from 'chalk';

import { MapLocation } from './interfaces';
import New_MapData from '../assets/json/New_MapData.json';

export function getMapMarkers(): MapLocation[] {
    // Cloned so that dragging a marker in edit mode can't mutate the imported JSON
    return JSON.parse(JSON.stringify(New_MapData.locations));
}


export function log(message: any, colour?: string) {
    switch (colour) {
        // case 'blue':
        //     console.log(chalk.blue(message));
        //     break;
        // case 'green':
        //     console.log(chalk.green(message));
        //     break;
        // case 'red':
        //     console.log(chalk.red(message));
        //     break;
        // case 'yellow':
        //     console.log(chalk.yellow(message));
        //     break;
        default:
            console.log(message);
            break;
    }
}