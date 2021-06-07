function App() {
    return(
        <div className="main">
            <CurrencyInfoBlock />
            <HistoryBlock />
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

class HistoryBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const history_url = 'http://127.0.0.1:5000/rates_history';
        let fetch_params = {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        };

        fetch(history_url, fetch_params)
        .then(response => response.json())
        .then(response_json => {
            for (let key in response_json) {
                const points = [];
                for (let i = 0; i < response_json[key].updatePoints.length; i++){
                    points.push({
                        x: response_json[key].updatePoints[i],
                        y: response_json[key].rates[i]
                    });
                }
                const data = {
                    datasets: [{
                        label: 'Изменение курса ' + key,
                        borderColor: 'rgb(50, 100, 245)',
                        showLine: true,
                        data: points
                    }]
                };
                let config = {
                    type: 'scatter',
                    data,
                    options: {
                        scales:{
                            x:{
                                ticks: {
                                    callback: (value, index, values) => {
                                        let date = new Date(value);
                                        return(date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
                                        + ' ' + date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear());
                                    }
                                }
                            }
                        },
                        tooltips: {
                            enabled: true,
                            mode: 'single',
                            callbacks: {
                                label: function(tooltipItems, data) {
                                    let multistringText = [tooltipItems.yLabel];
                                    multistringText.push('Another Item');
                                    multistringText.push(tooltipItems.index+1);
                                    multistringText.push('One more Item');
                                    return multistringText;
                                }
                            }
                        },
                    }
                };
                let chart = new Chart(document.getElementById(key), config);
            }
        });
    }

    render() {
        return (
            <div className="history-block">
                <h1> История изменения курса</h1>
                <canvas id="EUR"></canvas>
                <canvas id="USD"></canvas>
                <canvas id="GBP"></canvas>
            </div>
        )
    }
};

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
