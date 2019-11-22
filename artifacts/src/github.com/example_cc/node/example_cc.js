/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

const shim = require('fabric-shim');
const util = require('util');

var Chaincode = class {

  // Initialize the chaincode
  async Init(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    console.info('=========== Instantiated Gadget Chaincode ===========');
    return shim.success();
   }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    let method = this[ret.fcn];
    if (!method) {
      console.error('no method of name:' + ret.fcn + ' found');
      return shim.error('no method of name:' + ret.fcn + ' found');
    }

    console.info('\nCalling method : ' + ret.fcn);
    try {
      let payload = await method(stub, ret.params,this);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }


 // ***********************************************
 // Create a new Gadget
 // ***********************************************
  async createGadget(stub, args, thisClass) {
    console.info('=========inside create gadget method =========');
    
    if (args.length != 4) {
      return shim.error('Incorrect number of arguments. Expecting 4');
    }
    let gadgetModel = args[0];
    let gadgetColor = args[1].toLowerCase();
    let gadgetMake = parseInt(args[2]);
    let gadgetOwner = args[3].toLowerCase();
    if (typeof gadgetMake !== 'number') {
      throw new Error('gadgetMake must be a numeric string');
    }

    // console.info('gadgetModel '+gadgetModel)
    // console.info('gadgetColor   '+gadgetColor)
    // console.info('gadgetMake   '+gadgetMake)
    // console.info('gadgetOwner   '+gadgetOwner)

    // // ==== Check if gadget already exists ====
    let gadgetState = await stub.getState(gadgetModel);
   // console.info('gadgetState   '+gadgetState)

    if (gadgetState.toString()) {
      throw new Error('This gadget already exists: ' + gadgetModel);
    }

    // ==== Create gadget object and marshal to JSON ====
    let gadget = {};
    gadget.docType = 'gadget';
    gadget.model = gadgetModel;
    gadget.color = gadgetColor;
    gadget.make = gadgetMake;
    gadget.owner = gadgetOwner;

   await stub.putState(gadgetModel, Buffer.from(JSON.stringify(gadget)));

    console.info('gadget   '+gadget);
   console.info('- end create gadget');
}

 // ***********************************************
 // Read Gadget record on key basis
 // ***********************************************
 async readGadget(stub, args, thisClass) {
   console.info('=========inside read gadget method =========');
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the gadget to query');
    }

    let gadgetModel = args[0];
    if (!gadgetModel) {
      throw new Error(' gadget name must not be empty');
    }
    let gadgetAsbytes = await stub.getState(gadgetModel); 
    if (!gadgetAsbytes.toString()) {
      let jsonResp = {};
      jsonResp.Error = 'Gadget does not exist: ' + gadgetModel;
      throw new Error(JSON.stringify(jsonResp));
    }
    console.info('=======================================');
    console.log(gadgetAsbytes.toString());
    console.info('=======================================');
    return gadgetAsbytes;
  }

 // ***********************************************
 // Read All Gadget records
 // ***********************************************
  async getGadgetByRange(stub, args, thisClass) {
    console.info('=========inside getGadgetByRange method =========');

    if (args.length < 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }
    let startKey = args[0];
    let endKey = args[1];
    let resultData= await stub.getStateByRange(startKey, endKey);
  
    let method = thisClass['fetchData'];
    let results = await method(resultData);

    return Buffer.from(JSON.stringify(results));

  }
  // ***********************************************************
  // Change the Gadget ownership 
  // ***********************************************************
  async changeGadget(stub, args, thisClass) {
    console.info('=========inside changegadget method =========');
    
    // if (args.length < 2) {
    //   throw new Error('Atleast two parameter are required')
    // }
    let gadgetValue = args[0];
    let gadgetNewOwner = args[1].toLowerCase();
    console.info('after');

    console.info('Agruments '+ gadgetValue, gadgetNewOwner);

    let gadgetAsBytes = await stub.getState(gadgetValue);
    console.info('gadgetAsBytes'+gadgetAsBytes.toString());

    if (!gadgetAsBytes || !gadgetAsBytes.toString()) {
      throw new Error('gadget does not exist');
    }
    let changedGadget = {};
    try {
      changedGadget = JSON.parse(gadgetAsBytes.toString()); //unmarshal
    } catch (err) {
      let jsonResp = {};
      jsonResp.error = 'Failed to decode JSON of: ' + gadgetValue;
      throw new Error(jsonResp);
    }
    console.info(changedGadget);
    changedGadget.owner = gadgetNewOwner;

    let gadgetJSONasBytes = Buffer.from(JSON.stringify(changedGadget));
    await stub.putState(gadgetValue, gadgetJSONasBytes); 

    console.info('-sucessfully changed (success)');
  }


  // **********************************************
  // Delete Gadget record on key basis
  // ***********************************************

  async delete(stub, args) {
    
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }
     console.info('enter in delete function')
    let toDelete = args[0];

    // Delete the key from the state in ledger
    await stub.deleteState(toDelete);
  }

//iterate method 
async fetchData(iterator) {
    let allResults = [];
    while (true) {
      let res = await iterator.next();
      //console.info('res.value.key'+res.value.key)
      //console.info('res.value.value '+res.value.value)
  
      if (res.value && res.value.value.toString()) {
        let resData = {};
          resData.Key = res.value.key;

          try {
            resData.Record = JSON.parse(res.value.value.toString('utf8'));
          } catch (err) {
            console.log(err);
            resData.Record = res.value.value.toString('utf8');
          }
        
        allResults.push(resData);
      }
      if (res.done) {
        await iterator.close();
       //console.info('data is '+allResults);
        return allResults;
      }
    }
  }



};

shim.start(new Chaincode());
