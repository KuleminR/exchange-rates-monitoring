
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
//            EUR: {
//                lastUpdate: null,
//                rate: null,
//                spread_abs: null,
//                spread_rel: null,
//                rate_avg: null
//            },
//            USD: {
//                lastUpdate: null,
//                rate: null,
//                spread_abs: null,
//                spread_rel: null,
//                rate_avg: null
//            },
//            GBP: {
//                lastUpdate: null,
//                rate: null,
//                spread_abs: null,
//                spread_rel: null,
//                rate_avg: null
//            },
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
        fetch(rates_url, fetch_params)
        .then(response => response.json())
        .then(data => {
            let rates_list = [];
            let update_time_list = [];
            for (let key in data) {
                update_time_list.push(data[key]['lastUpdate']);
                rates_list.push(data[key]['rate']);
            };
            this.setState({
                EUR: {
                    lastUpdate: update_time_list[0],
                    rate: rates_list[0]
                },
                USD: {
                    lastUpdate: update_time_list[1],
                    rate: rates_list[1]
                },
                GBP: {
                    lastUpdate: update_time_list[2],
                    rate: rates_list[2]
                }
            });
            console.log(this.state);
        });
    }

    render() {
        try
        {
            let info = this.state.EUR.rate;
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
