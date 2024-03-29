function App() {
    return(
        <div className="main">
            <CurrencyInfoBlock />
            <ChartBlock name="История изменения курса"
             url="http://127.0.0.1:5000/rates_history"
             label="Значение курса" color="rgb(50, 100, 200)"
             className="history-block" />
             <ChartBlock name="Прогноз курса на ближайшие 3 дня"
             url="http://127.0.0.1:5000/rates_forecast"
             label="Значение курса" color="rgb(250, 120, 70)"
             className="forecast-block"/>
        </div>
    )
}

class CurrencyInfoBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
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
                <div className="currency-info">
                    <h1>Информация о валюте (по отношению к рублю)</h1>
                    <ul>{ info }</ul>
                </div>
            );
        } catch(error) {
            let info = 'Updating...';
            return (
                <div className="currency-info">
                    <h1>Информация о валюте (по отношению к рублю)</h1>
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
                </div>
            );
        }
    }
};

class ChartBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const history_url = this.props.url;
        let fetch_params = {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        };

        fetch(history_url, fetch_params)
        .then(response => response.json())
        .then(response_json => {
            for (let key in response_json) {
                const points = [];
                const labels = [];
                for (let i = 0; i < response_json[key].updatePoints.length; i++){
                    points.push(response_json[key].rates[i]);
                    let date = new Date(response_json[key].updatePoints[i]);
                    labels.push(date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
                        + ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear());
                }
                const data = {
                    labels: labels,
                    datasets: [{
                        label: this.props.label + ' ' + key,
                        borderColor: this.props.color,
                        showLine: true,
                        data: points
                    }]
                };
                let config = {
                    type: 'line',
                    data,
                    options: {}
                };
                let chart = new Chart(document.getElementById(this.props.name + '-' + key), config);
            }
        });
    }

    render() {
        let ids = [];
        for (let currency_name of ['EUR', 'USD', 'GBP']){
            ids.push(this.props.name + '-' + currency_name);
        }
        return (
            <div className={this.props.className}>
                <h1>{this.props.name}</h1>
                <ul>
                    <li key = {ids[0]}><canvas id={ids[0]}></canvas></li>
                    <li key = {ids[1]}><canvas id={ids[1]}></canvas></li>
                    <li key = {ids[2]}><canvas id={ids[2]}></canvas></li>
                </ul>
            </div>
        )
    }
};

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
