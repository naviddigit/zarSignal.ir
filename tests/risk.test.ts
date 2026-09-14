import test from 'node:test';import assert from 'node:assert/strict';import{positionSize,riskAmount,riskReward}from'../src/lib/risk';
test('generic risk calculators use only explicit user inputs',()=>{assert.deepEqual(riskAmount(100000,2),{ok:true,value:2000});assert.deepEqual(positionSize(2000,500),{ok:true,value:4});assert.deepEqual(riskReward(100,90,130),{ok:true,value:3})});
test('risk calculators reject unsafe or ambiguous numeric inputs',()=>{for(const result of[riskAmount(0,2),riskAmount(100,101),positionSize(100,0),riskReward(100,100,120)])assert.equal(result.ok,false)});
