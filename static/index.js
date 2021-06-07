function App() {
    return(
        <div className="main">
            <CurrencyInfoBlock />
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
        });
    }

    render() {
        try
        {
            const currencies = ['EUR', 'USD', 'GBP'];
            let info = [];
            for (let currency of currencies) {
                let date = new Date(this.state.rates_state[currency].lastUpdate);
                let last_update_str = date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
                + ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
                info.push(
                    <li key = {currency}>
                        <h1> {currency} </h1>
                        <p>Курс: {this.state.rates_state[currency].rate}</p>
                        <p>Средневзвешенный курс: {this.state.rates_avg_state[currency]}</p>
                        <p>Спред (абсолютный): {this.state.spread_state[currency].spread_abs}</p>
                        <p>Спред (относительный): {this.state.spread_state[currency].spread_rel}%</p>
                        <p>Актуально на {last_update_str}</p>
                    </li>
                );
            }
            return (
                <ul>{ info }</ul>
            );
        } catch(error) {
            let info = 'Updating...';
            return (
                <ul>
                    <li>
                        <h1>Updating...</h1>
                        <p>Updating...</p>
                        <p>Updating...</p>
                        <p>Updating...</p>
                        <p>Updating...%</p>
                        <p>Updating...</p>
                    </li>
                </ul>
            );
        }
    }
};


ReactDOM.render(
    <App />,
    document.getElementById('root')
);
