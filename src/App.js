import './App.css';
import React from 'react';
const crypto = require('crypto');

function pickNFrom(list, number) {
    let src = list.slice();
    let res = [];
    if (src.length < number) {
        throw new Error('Too many selections');
    }
    while (res.length < number) {
        let index = crypto.randomInt(src.length);
        res.push(JSON.parse(JSON.stringify(src[index])));
        src.splice(index, 1);
    }
    return { chosen: res, remain: src };
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
            <button
                onClick={(e)=>{
                    e.stopPropagation();
                    this.startLottery(1);
                }}
            >开始抽一等奖</button>
            <button
                onClick={(e)=>{
                    e.stopPropagation();
                    this.startLottery(2);
                }}
            >开始抽二等奖</button>
            <DisplayPanel ref={this.display}/>
            {this.state.nameListHash}
        </div>
    }
}
