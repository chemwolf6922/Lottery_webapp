import './App.css';
import React from 'react';
const crypto = require('crypto');

function pickNFrom(list, n) {
    let remain = list.slice();
    let chosen = [];
    if (remain.length < n) {
        throw new Error('Too many selections');
    }
    while (chosen.length < n) {
        let index = crypto.randomInt(remain.length);
        chosen.push(JSON.parse(JSON.stringify(remain[index])));
        remain.splice(index, 1);
    }
    return {chosen, remain};
}

class DisplayPanel extends React.Component {
    constructor(params) {
        super(params);
        this.state = {
            items:[]
        }
    }
    render(){
        return <div 
            className='display-panel'
        >
            {JSON.stringify(this.state.items)}
        </div>
    }
}

export class App extends React.Component {
    constructor(params) {
        super(params);
        this.quantityInputFirst = React.createRef();
        this.quantityInputSecond = React.createRef();
        this.display = React.createRef();
        this.prizeList = {
            first:{
                started:false,
                finished:false,
                names:[]
            },
            second:{
                started:false,
                finished:false,
                names:[]
            },
            remain:{
                names:[]
            }
        }
        this.state = {
            nameListHash:''
        }; 
    }
    componentDidMount(){
        document.addEventListener('keydown',(e)=>{this.handleKey(e)});
    }
    loadNameList(file){
        let reader = new FileReader();
        reader.onloadend = ()=>{
            let raw = reader.result;
            try {
                let nameList = JSON.parse(raw);
                let nameListHash = crypto.createHash('sha256').update(JSON.stringify(nameList)).digest('hex').toUpperCase();
                this.prizeList.remain.names = nameList;
                this.setState({...this.state,nameListHash});
            } catch (error) {
                alert('请检查名单格式')
            }
        };
        reader.readAsText(file);
    }
    startLottery(prize){

    }
    handleKey(event){
        // keyCode 13: Enter
        if(event.keyCode===13){

        }
    }
    render(){
        return <div className='App'>
            <input
                type='file'
                accept='.json'
                onChange={(e)=>{
                    this.loadNameList(e.target.files[0]);
                }}
            />
            <input
                type='number'
                min='0'
                ref={this.quantityInputFirst}
            />
            <input
                type='number'
                min='0'
                ref={this.quantityInputSecond}
            />
            <button className='button'
                onClick={(e)=>{
                    e.stopPropagation();
                    this.startLottery(1);
                }}
            >开始抽一等奖</button>
            <button className='button'
                onClick={(e)=>{
                    e.stopPropagation();
                    this.startLottery(2);
                }}
            >开始抽二等奖</button>
            <a
                href={`data:text/plain;charset=utf8,${encodeURIComponent('test text')}`}
                download='test.csv'
            >测试文件下载</a>
            <DisplayPanel ref={this.display}/>
            {this.state.nameListHash}
        </div>
    }
}
