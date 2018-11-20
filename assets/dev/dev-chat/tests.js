
import history from './history.json';

export default {
    historyPerformanceTest() {
        const startTime = new Date().getTime()

        __chat__.withHistory( history );

        const endTime = new Date().getTime();
        console.log( 'history test duration: ', endTime - startTime );
    }
};
