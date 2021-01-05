import './App.css';
import React from 'react';
const crypto = require('crypto');

const FPS = 20;

function randomInt(range) {
    // remove the bias by removing the uneven part.
    let cap = (0xFFFFFFFF >>> 0) - (0xFFFFFFFF >>> 0) % range;
    let random = null;
    while (random === null || random >= cap) {
        let buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        random = buf[0];
    }
    return random % range;
}


function pickNFrom(list, n, filter = () => true) {
    let source = list.slice();
    let remain = source.filter(filter);
    let filterOut = source.filter(item => !filter(item));
    let chosen = [];
    if (remain.length < n) {
        throw new Error('Too many selections');
    }
    while (chosen.length < n) {
        let index = randomInt(remain.length);
        chosen.push(JSON.parse(JSON.stringify(remain[index])));
        remain.splice(index, 1);
    }
    remain = remain.concat(filterOut);
    return { chosen, remain };
}

class PrizeDisplay extends React.Component {
    constructor(params) {
        super(params);
        this.state = {
            prize: null
        }
    }
    async displayPrize(prize) {
        return new Promise(resolve => this.setState({ ...this.state, prize }, resolve));
    }
    render() {
        if (this.state.prize !== null) {
            return <div
                className='prize-display'
            >
                <img className='prize-image' alt='' src={this.state.prize.image} />
                <div className='prize-text'>
                    <div className='prize-name'>{this.state.prize.name}</div>
                    <div className='prize-description'>{this.state.prize.description}</div>
                    <div className='prize-price'>{`￥${this.state.prize.price}`}</div>
                </div>
            </div>
        } else {
            // config not loaded
            return <div className='prize-display' />
        }
    }
}

class NameDisplay extends React.Component {
    constructor(params) {
        super(params);
        this.state = {
            names: [],
            confirmed: false
        }
    }
    async displayNames(names, confirmed) {
        let nameToD = names.slice();
        nameToD.sort((a,b)=>a.name.localeCompare(b.name));
        return new Promise(resolve => this.setState({ ...this.state, names:nameToD, confirmed }, resolve));
    }
    render() {
        return <div
            className='name-display'
        >
            {this.state.names.map(n => {
                if (this.state.confirmed) {
                    return <div className='name-confirmed' key={n.name}>{n.name}</div>;
                } else {
                    return <div className='name' key={n.name}>{n.name}</div>;
                }
            })}
        </div>
    }
}

export class App extends React.Component {
    constructor(params) {
        super(params);
        this.quantityInput = React.createRef();
        this.nameDisplay = React.createRef();
        this.prizeDisplay = React.createRef();
        // lottery data
        this.currentPrizeCnt = null;
        this.currentPrize = null;
        this.animationHandle = null;
        this.remainNames = [];
        this.prizeList = [];
        this.result = [];
        // state
        this.state = {
            nameListHash: '',
            resultHash: '',
            configLoaded: false,
            finished: false
        };
    }
    componentDidMount() {
        document.addEventListener('keydown', (e) => { this.handleKey(e) });
    }
    async loadConfigFiles(files) {
        // no directory check is performed, make sure to upload the right folder
        await new Promise(resolve => this.setState({ ...this.state, configLoaded: true }, resolve));
        // read prize list
        let prizeCfgFile = files.find(f => f.name === 'prizes.json');
        let prizeCfgReader = new FileReader();
        prizeCfgReader.onloadend = () => {
            let prizeCfg = JSON.parse(prizeCfgReader.result);
            prizeCfg.forEach(prize => {
                let imgFile = files.find(f => f.name === prize.image);
                let img = URL.createObjectURL(imgFile);
                this.prizeList.push({
                    ...prize,
                    started: false,
                    finished: false,
                    result: [],
                    image: img
                });
            });
        }
        prizeCfgReader.readAsText(prizeCfgFile);
        // read name list
        let nameListFile = files.find(f => f.name === 'names.json');
        let nameListReader = new FileReader();
        nameListReader.onloadend = () => {
            let nameList = JSON.parse(nameListReader.result);
            let nameListHash = crypto.createHash('sha1').update(JSON.stringify(nameList)).digest('hex').toUpperCase();
            this.remainNames = nameList;
            this.setState({ ...this.state, nameListHash });
        }
        nameListReader.readAsText(nameListFile);
    }
    startLottery() {
        if (this.currentPrize?.started === false && this.currentPrize?.finished === false) {
            const quantity = parseInt(this.quantityInput.current.value);
            if (isNaN(quantity)) {
                alert('请输入奖项数量');
                return;
            }
            this.currentPrize.quantity = quantity;
            this.animationHandle = setInterval(() => {
                // certain prizes are not avaliable for interns and partners
                let filter = () => true;
                if (this.currentPrize.notAvaliableToIntern === true) {
                    filter = n => n.intern !== true;
                }
                let { chosen, remain } = pickNFrom(this.remainNames, this.currentPrize.quantity, filter);
                this.nameDisplay.current.displayNames(chosen, false);
            }, 1000 / FPS >>> 0);
            this.currentPrize.started = true;
        }
    }
    async finishLottery() {
        if (this.currentPrize?.started === true && this.currentPrize?.finished === false) {
            this.currentPrize.started = false;
            clearInterval(this.animationHandle);
            // certain prizes are not avaliable for interns and partners
            let filter = () => true;
            if (this.currentPrize.notAvaliableToIntern === true) {
                filter = n => n.intern !== true;
            }
            let { chosen, remain } = pickNFrom(this.remainNames, this.currentPrize.quantity, filter);
            this.currentPrize.result = chosen;
            this.remainNames = remain;
            this.currentPrize.finished = true;
            await this.nameDisplay.current.displayNames(chosen, true);
            if (!this.prizeList.find(p => p.finished === false)) {
                await this.genResults();
            }
        }
    }
    async genResults() {
        let result = this.prizeList.map(p => ({
            name: p.name,
            description: p.description,
            price: p.price,
            time: `${new Date()}`,
            result: p.result.map(n => n.name),
        }));
        this.result = JSON.stringify(result);
        let hash = crypto.createHash('sha1').update(this.result).digest('hex').toUpperCase();
        return new Promise(resolve => this.setState({ ...this.state, finished: true, resultHash: hash }, resolve));
    }
    async nextPrize() {
        if (this.state.configLoaded) {
            if (this.currentPrizeCnt === null) {
                this.currentPrizeCnt = 0;
                this.currentPrize = this.prizeList[this.currentPrizeCnt];
                await this.prizeDisplay.current.displayPrize(this.currentPrize);
                await this.nameDisplay.current.displayNames([], false);
            } else if (this.currentPrize.finished) {
                if (this.currentPrizeCnt < (this.prizeList.length - 1)) {
                    this.currentPrizeCnt++;
                    this.currentPrize = this.prizeList[this.currentPrizeCnt];
                    await this.prizeDisplay.current.displayPrize(this.currentPrize);
                    await this.nameDisplay.current.displayNames([], false);
                }
            }
        }
    }
    handleKey(event) {
        // keyCode 13: Enter
        if (event.keyCode === 13) {
            this.finishLottery();
        }
    }
    render() {
        return <div className='App'>
            <div className='tool-bar'>
                <input
                    className='file-upload'
                    type='file'
                    ref={this.fileUpload}
                    webkitdirectory=""
                    disabled={this.state.configLoaded}
                    hidden={this.state.configLoaded}
                    onChange={(e) => {
                        let files = [];
                        for (let i = 0; i < e.target.files.length; i++) {
                            files.push(e.target.files[i]);
                        }
                        this.loadConfigFiles(files);
                    }}
                />
                <a
                    hidden={!this.state.finished}
                    href={`data:text/plain;charset=utf8,${encodeURIComponent(this.result)}`}
                    download='result.json'
                >抽奖结果下载</a>
                <div className='quantity-input-label'>人数</div>
                <input
                    className='quantity-input'
                    type='number'
                    min='0'
                    ref={this.quantityInput}
                />
                <div className='button-start'
                    onClick={(e) => {
                        e.stopPropagation();
                        this.startLottery();
                    }}
                >开始抽奖</div>
                <div className='button-next'
                    onClick={(e) => {
                        e.stopPropagation();
                        this.nextPrize();
                    }}
                >下一个奖项</div>
            </div>
            <div className='left-part'>
                <PrizeDisplay ref={this.prizeDisplay} />
                <div className='hash-aera'>
                    <br />
                    {`参与名单哈希(SHA1): ${this.state.nameListHash}`}
                    <br />
                    {`获奖名单哈希(SHA1): ${this.state.resultHash}`}
                    <br />
                </div>
            </div>
            <div className='right-part'>
                <NameDisplay ref={this.nameDisplay} />
            </div>
        </div>
    }
}
