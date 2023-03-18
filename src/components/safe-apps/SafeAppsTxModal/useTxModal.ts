import { useCallback, useState } from 'react'
import type { BaseTransaction, RequestId, SendTransactionRequestParams } from '@safe-global/safe-apps-sdk'
import useSignlessModule from '@/hooks/useSignlessModule'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { BigNumber, ethers } from 'ethers'
import useChainId from '@/hooks/useChainId'
import { getSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { solidityKeccak256 } from 'ethers/lib/utils'
import { GelatoRelay } from '@gelatonetwork/relay-sdk'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'

const relay = new GelatoRelay()

type TxModalState = {
  isOpen: boolean
  txs: BaseTransaction[]
  requestId: RequestId
  params?: SendTransactionRequestParams
}

const INITIAL_CONFIRM_TX_MODAL_STATE: TxModalState = {
  isOpen: false,
  txs: [],
  requestId: '',
  params: undefined,
}

type ReturnType = [
  TxModalState,
  (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => void,
  () => void,
]

const useTxModal = (): ReturnType => {
  const [txModalState, setTxModalState] = useState<TxModalState>(INITIAL_CONFIRM_TX_MODAL_STATE)
  const {
    signlessModuleAddress,
    signlessContract,
    isSignlessEnabled,
    isValidDelegate,
    delegatePrivateKey,
    delegateAddress,
  } = useSignlessModule()
  const chainId = useChainId()
  const safe = getSafeSDK()
  const readOnlyProvider = useWeb3ReadOnly()

  const openTxModal = useCallback(
    (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => {
      if (
        readOnlyProvider &&
        safe &&
        signlessModuleAddress &&
        signlessContract &&
        isSignlessEnabled &&
        isValidDelegate &&
        delegatePrivateKey
      ) {
        // TODO(kevincharm): Create a custom Safe App for enabling the Signless module. Once the
        // module is enabled, allow the safe owner to "login" and create a delegated private key
        // which will be saved on the user's browser (localStorage).
        // TODO(kevincharm): Show a modal the first time the user tries this action. The user
        // should be able to tick whether or not they want to be asked the next time they perform
        // transactions for this particular action.
        // In the case that the user approves, this app should fetch the locally-stored Signless
        // private key, automatically sign this transaction, then submit it via the Gelato relay.
        // for (const tx of txs) {
        //   const selector = tx.data.slice(0, 10)
        //   // TODO(kevincharm): Remember choice for [to, selector]
        // }
        // This is necessary to trigger subscription to tx events
        setTxModalState({
          isOpen: false,
          txs,
          requestId,
          params,
        })
        ;(async () => {
          const safeTx = await createMultiSendCallOnlyTx(txs)
          const delegate = new ethers.Wallet(delegatePrivateKey, readOnlyProvider)
          const nonce = await signlessContract.getNonce(delegateAddress)
          const execTxSig = await delegate._signTypedData(
            {
              name: 'SignlessSafeModule',
              version: '1.0.0',
              chainId,
              verifyingContract: signlessModuleAddress,
            },
            {
              ExecSafeTx: [
                {
                  type: 'address',
                  name: 'safe',
                },
                {
                  type: 'address',
                  name: 'to',
                },
                {
                  type: 'uint256',
                  name: 'value',
                },
                {
                  type: 'bytes32',
                  name: 'dataHash',
                },
                {
                  type: 'uint256',
                  name: 'nonce',
                },
              ],
            },
            {
              safe: safe.getAddress(),
              to: safeTx.data.to,
              value: safeTx.data.value,
              dataHash: solidityKeccak256(['bytes'], [safeTx.data.data]),
              nonce,
            },
          )

          const fee = await relay.getEstimatedFee(
            Number(chainId),
            ethers.constants.AddressZero,
            BigNumber.from(300_000),
            false,
          )
          const tx = await signlessContract.populateTransaction.execViaRelay(
            fee.mul(2),
            delegateAddress,
            safe.getAddress(),
            safeTx.data.to,
            safeTx.data.value,
            safeTx.data.data,
            execTxSig,
          )
          const relayResponse = await relay.callWithSyncFee({
            chainId,
            target: signlessModuleAddress,
            data: tx.data!,
            feeToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          })
          console.log(`Gelato relay taskId: ${relayResponse.taskId}`)

          for (let tries = 0; tries < 8; tries++) {
            const expFactor = 2 ** tries
            await new Promise((resolve) => setTimeout(resolve, 2500 * expFactor))

            const relayTaskStatus = await relay.getTaskStatus(relayResponse.taskId)
            if (!relayTaskStatus) continue

            const taskState = relayTaskStatus.taskState
            if (taskState === 'ExecSuccess') {
              return txDispatch(TxEvent.SAFE_APPS_REQUEST, {
                safeAppRequestId: requestId,
                safeTxHash: relayTaskStatus.transactionHash!,
              })
            } else if (
              taskState === 'CheckPending' ||
              taskState === 'ExecPending' ||
              taskState === 'WaitingForConfirmation'
            ) {
              // "Pending"
              continue
            } else {
              return txDispatch(TxEvent.SAFE_APPS_REQUEST, {
                safeAppRequestId: requestId,
                safeTxHash: relayTaskStatus.transactionHash!,
              })
            }
          }

          return txDispatch(TxEvent.SAFE_APPS_REQUEST, {
            safeAppRequestId: requestId,
            safeTxHash: '0x',
          })
        })()
      } else {
        // No delegate enabled -> regular tx signing flow
        return setTxModalState({
          isOpen: true,
          txs,
          requestId,
          params,
        })
      }
    },
    [
      safe,
      chainId,
      signlessModuleAddress,
      signlessContract,
      isSignlessEnabled,
      isValidDelegate,
      delegateAddress,
      delegatePrivateKey,
      readOnlyProvider,
    ],
  )

  const closeTxModal = useCallback(() => setTxModalState(INITIAL_CONFIRM_TX_MODAL_STATE), [])

  return [txModalState, openTxModal, closeTxModal]
}

export default useTxModal
