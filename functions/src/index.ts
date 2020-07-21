import * as admin from "firebase-admin";
const functions = require('firebase-functions');
const app = admin.initializeApp();
import SquareConnect = require('square-connect');
import QueryDocumentSnapshot = admin.firestore.QueryDocumentSnapshot;
import {EventContext} from "firebase-functions";
const defaultClient = SquareConnect.ApiClient.instance;
const firestore = app.firestore()
const oauth2 = defaultClient.authentications['oauth2'];
oauth2.accessToken = "EAAAEGHqnSltURHr2q_mAb_beZoBIc3iyteekRCAFWU7PfDh0Qz1mqV-HL-nJl32";

const crypto = require('crypto');

defaultClient.basePath = "https://connect.squareupsandbox.com";

exports.paymentCreation = functions.region('europe-west2').firestore
    .document('Users/{userId}/Purchases/{paymentId}')
    .onCreate(( change : QueryDocumentSnapshot, context : EventContext) => {
        const newValue = change.data();
        const userId : string = context.params.userId;
        const paymentId : string = context.params.paymentId;
        //const shopId : String = newValue.shopId

        console.log(newValue.charge)
        if (newValue.charge !== undefined) {
            console.log("already processed")
            return "Payment Already Processed";
        }

        let paymentRequest: SquareConnect.CreatePaymentRequest;

        async function constructPaymentRequest() {
            const documentSnapshot = await firestore.collection("Users").doc(userId).get()
            const data = documentSnapshot.data()
            let square_id

            if(data !== undefined){
                square_id = data.square_id
            }

            paymentRequest = {
                "idempotency_key": crypto.randomBytes(12).toString('hex'),
                "source_id": newValue.nonce,
                "autocomplete": false,
                "reference_id":paymentId,
                "customer_id":square_id,
                "amount_money": {
                    amount: parseFloat(newValue.amount),
                    currency: 'GBP'
                },
            };
        }



        async function createPaymentRequest() {
            await constructPaymentRequest();

            const paymentsApi = new SquareConnect.PaymentsApi();

            // @ts-ignore
            return await paymentsApi.createPayment(paymentRequest);
        }

        async function detailsToFirestore() {
            console.log("calling createPaymentRequest")
            let paymentResponse = await createPaymentRequest();
            console.log("createPaymentRequest returned")
            await admin.firestore()
                .doc(`/Users/${userId}/Purchases/${paymentId}`)
                .set(JSON.parse(JSON.stringify(paymentResponse)), {merge: true});

            return true;
        }

        return detailsToFirestore();

    });