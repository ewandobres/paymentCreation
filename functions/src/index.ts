// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
import * as google from "firebase-admin";
import QueryDocumentSnapshot = google.firestore.QueryDocumentSnapshot;
import {EventContext} from "firebase-functions";

const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

import SquareConnect = require('square-connect');
const {
    PaymentsApi
} = require('square-connect');
const defaultClient = SquareConnect.ApiClient.instance;
const crypto = require('crypto');

let oauth2 = defaultClient.authentications['oauth2'];
oauth2.accessToken = "EAAAEGHqnSltURHr2q_mAb_beZoBIc3iyteekRCAFWU7PfDh0Qz1mqV-HL-nJl32";

defaultClient.basePath = "https://connect.squareupsandbox.com";

const paymentsApi = new PaymentsApi(defaultClient);

exports.paymentCreation = functions.region('europe-west2').firestore
    .document('Users/{userId}/Purchases/{paymentId}')
    .onCreate(( change : QueryDocumentSnapshot, context : EventContext) => {
        const newValue = change.data();
        const userId : String = context.params.userId;
        const paymentId : String = context.params.paymentId;
        //const shopId : String = newValue.shopId

        console.log(newValue.charge)
        if (newValue.charge !== undefined) {
            console.log("already processed")
            return "Payment Already Processed";
        }

        const paymentRequest = {
            "idempotency_key": crypto.randomBytes(12).toString('hex'),
            "source_id": newValue.nonce,
            "autocomplete": false,
            "reference_id":paymentId,
            "amount_money": {
                amount: parseFloat(newValue.amount),
                currency: 'GBP'
            },
        };

        async function createPaymentRequest() {
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