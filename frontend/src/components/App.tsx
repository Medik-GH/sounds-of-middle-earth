import * as ReactGA from 'react-ga';
import '../assets/less/App.less';
import { Route, Routes } from 'react-router-dom';
import { Layout } from 'antd';
import { useEffect } from 'react';

import { LOTRMap } from './pages/Map';
import { Feedback } from './pages/Feedback';
import { Source } from './pages/Source';
import { Credits } from './pages/Credits';
import { Navigation } from './Navigation';

const TRACKING_ID = 'G-V2KZY1V4GN';

ReactGA.initialize(TRACKING_ID);

const App = () => {
    useEffect(() => {
        ReactGA.pageview('/map');
    }, []);

    return (
        <div className="App">
            <Layout style={{ minHeight: '100vh' }}>
                <Navigation/>
                <div id="content">
                    <Layout className="site-layout">
                        <Routes>
                            <Route path='/' element={<LOTRMap/>} />
                            <Route path='/map' element={<LOTRMap/>} />
                            <Route path='/feedback' element={<Feedback/>} />
                            <Route path='/source' element={<Source/>} />
                            <Route path='/credits' element={<Credits/>} />
                        </Routes>
                    </Layout>
                </div>
            </Layout>
        </div>
    );
};

export default App;