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
import type { TransactionStatusResponse } from '@gelatonetwork/relay-sdk'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'

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

export interface SignlessTxModalState {
  isOpen: boolean
  safeTx?: SafeTransaction
  estimatedFee?: BigNumber
  relayTaskId?: string
  tryCount?: number
  relayTxStatus?: TransactionStatusResponse
}

type ReturnType = [
  TxModalState,
  (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => void,
  () => void,
  SignlessTxModalState,
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
  const [signlessTxModal, setSignlessTxModalState] = useState<SignlessTxModalState>({ isOpen: false })

  const openTxModal = useCallback(
    async (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => {
      if (
        readOnlyProvider &&
        safe &&
        signlessModuleAddress &&
        signlessContract &&
        isSignlessEnabled &&
        isValidDelegate &&
        delegatePrivateKey
      ) {
        setSignlessTxModalState({
          isOpen: true,
        })
        // This is necessary to trigger subscription to tx events
        setTxModalState({
          isOpen: false,
          txs,
          requestId,
          params,
        })
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
          BigNumber.from(300_000) /** TODO(kevincharm): How do we get the estimated gas limit */,
          false,
        )

        setSignlessTxModalState((s) => ({
          ...s,
          isOpen: true,
          estimatedFee: fee,
        }))
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

        setSignlessTxModalState((s) => ({
          ...s,
          isOpen: true,
          relayTaskId: relayResponse.taskId,
        }))

        for (let tries = 0; tries < 8; tries++) {
          setSignlessTxModalState((s) => ({
            ...s,
            isOpen: true,
            tryCount: tries,
          }))
          const expFactor = 2 ** tries
          await new Promise((resolve) => setTimeout(resolve, 2500 * expFactor))

          const relayTxStatus = await relay.getTaskStatus(relayResponse.taskId)
          if (!relayTxStatus) continue

          setSignlessTxModalState((s) => ({
            ...s,
            isOpen: true,
            relayTxStatus,
          }))

          const taskState = relayTxStatus.taskState
          if (taskState === 'ExecSuccess') {
            setTimeout(() => {
              setSignlessTxModalState((s) => ({
                ...s,
                isOpen: false,
              }))
            }, 1000)
            return txDispatch(TxEvent.SAFE_APPS_REQUEST, {
              safeAppRequestId: requestId,
              safeTxHash: relayTxStatus.transactionHash!,
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
              safeTxHash: relayTxStatus.transactionHash!,
            })
          }
        }

        return txDispatch(TxEvent.SAFE_APPS_REQUEST, {
          safeAppRequestId: requestId,
          safeTxHash: '0x',
        })
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
      setSignlessTxModalState,
    ],
  )

  const closeTxModal = useCallback(() => setTxModalState(INITIAL_CONFIRM_TX_MODAL_STATE), [])

  const closeSignlessTxModal = useCallback(
    () =>
      setSignlessTxModalState((s) => ({
        ...s,
        isOpen: false,
      })),
    [setSignlessTxModalState],
  )

  return [txModalState, openTxModal, closeTxModal, signlessTxModal, closeSignlessTxModal]
}

export default useTxModal
