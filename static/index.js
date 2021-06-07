//function sendGetRequest(url){
//    const headers = {
//        'Content-Type': 'application/json'
//    };
//    return fetch(url, {
//        method: 'GET',
//        headers: headers
//    }).then( response => {
//        if (response.ok){
//            return response.json();
//        }
//    })
//
//    return response.json().then(err => {
//        let e = new Error('Ошибка сервера');
//        e.data = err;
//        throw e;
//    })
//}

function App() {
    return(
        <div className="main">
            <div className="all-stats">
                <CurrencyInfoBlock />
            </div>
        </div>
    )
}

class CurrencyInfoBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
        const rates_url = 'http://127.0.0.1:5000/rates';
        const spread_url = 'http://127.0.0.1:5000/spread';
        const rates_avg_url = 'http://127.0.0.1:5000/rates_average';
        let fetch_params = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // загрузка данных о курсе
        fetch(rates_url, fetch_params)
        .then(response => response.json())
        .then(data => {
            let updated_state = {'rates_state': {}};

            for (let key in data) {
                updated_state.rates_state[key] = {
                    'lastUpdate': data[key]['lastUpdate'],
                    'rate': data[key]['rate']
                };
            };
            this.setState(updated_state);
            console.log(this.state);
        });

        // загрузка данных о спреде
        fetch(spread_url, fetch_params)
        .then(response => response.json())
        .then(data => {
            let updated_state = {'spread_state': {}};

            for (let key in data) {
                updated_state.spread_state[key] = {
                    'spread_abs': data[key]['abs'],
                    'spread_rel': data[key]['rel']
                };
            };
            this.setState(updated_state);
            console.log(this.state);
        });

        // загрузка данных о средневзвешенном значении курса
        fetch(rates_avg_url, fetch_params)
        .then(response => response.json())
        .then(data => {
            let updated_state = {'rates_avg_state': {}};

            for (let key in data) {
                updated_state.rates_avg_state[key] = data[key];
            };
            this.setState(updated_state);
            console.log(this.state);
        });
    }

    render() {
        try
        {
            let info = this.state.rates_state.EUR.rate;
            return (
                <h1>{ info }</h1>
            );
        } catch(error) {
            let info = 'Not found';
            return (
                <h1>{ info }</h1>
            );
        }
    }
};


ReactDOM.render(
    <App />,
    document.getElementById('root')
);
