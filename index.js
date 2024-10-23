require("dotenv").config()

const { Connection } = require("@solana/web3.js")
//geyser client
const Client=require("@triton-one/yellowstone-grpc");

const PUMPFUN_CONTRACT="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
const connection=new Connection(process.env.RPC_API)
const bs58=require("bs58")

function connectGeyser(){
    const client =new Client.default("http://grpc.solanavibestation.com:10000/",undefined,undefined);
    client.getVersion()
    .then(async version=>{
        try {
            console.log(version)
            const request =Client.SubscribeRequest.fromJSON({
                accounts: {},
                slots: {},
                transactions: {
                    pumpfun: {
                        vote: false,
                        failed: false,
                        signature: undefined,
                        accountInclude: [PUMPFUN_CONTRACT],
                        accountExclude: [],
                        accountRequired: [],
                    },
                },
                transactionsStatus: {},
                entry: {},
                blocks: {},
                blocksMeta: {},
                accountsDataSlice: [],
                ping: undefined,
                commitment: Client.CommitmentLevel.PROCESSED
            })
        
            const stream =await client.subscribe();
            stream.on("data", async (data) => {
                if(data.transaction&&data.transaction.transaction&&data.transaction.transaction.signature) {
                    const sig=bs58.encode(data.transaction.transaction.signature)
                    const transaction=data.transaction.transaction;
                    if(transaction.meta.logMessages.some(log=>log.includes("InitializeMint2"))){
                        console.log(`https://solscan.io/tx/${sig}`)
                        console.log(JSON.stringify(transaction))
                    }
                }
            });
            await new Promise((resolve, reject) => {
                stream.write(request, (err) => {
                    if (err === null || err === undefined) {
                    resolve();
                    } else {
                    reject(err);
                    }
                });
            }).catch((reason) => {
                console.error(reason);
                throw reason;
            });
        } catch (error) {
            console.log(error)
            console.log("RECONNECTING!!!")
            setTimeout(() => {
                connectGeyser()
            }, 2000);
            
        }

    });
}

connectGeyser()