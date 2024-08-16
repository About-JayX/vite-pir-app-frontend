import { Text } from '@/components/text'
import Navigation from './components/navigation'
import RouterProvider from '@/provider/router'
import { Box } from '@material-ui/core'
import { useRouter } from 'preact-router'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Fragment } from 'preact/jsx-runtime'
import { AiOutlineCheckCircle } from 'react-icons/ai'
import { semicolon } from '@/utils'
import Button from '@/components/button'
import {
  updateBindStatus,
  updateFriendRank,
  updateInviteRank,
  updateNewUser,
  updateTelegramUserData,
  updateUserRank,
  updateUserReward,
} from '@/store/user'
import { HeaderTitle, Title } from '@/components/title'
import { useTranslation } from 'react-i18next'
import { useTelegram } from '@/provider/telegram'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import api from '@/api'
import {
  getYearFromTimestamp,
  predictRegistrationDate,
} from '@/utils/registrationPredictor'
import Message from '@/components/message'
import Header from './components/header'
import Modals from '@/components/modal'
import Loader from './components/loader'
// import SEO from "@/components/seo";

const Progress = ({
  text,
  value = 0,
  icon = true,
}: {
  text?: string
  value?: number
  icon?: boolean
}) => {
  return (
    <div className="grid gap-1 h-min">
      <div className="flex justify-between gap-3">
        <Text>{text}</Text>
        <span>
          {icon ? (
            <AiOutlineCheckCircle
              // @ts-ignore
              className="icon"
              style={{ color: value === 100 ? '#0d6efd' : '' }}
            />
          ) : (
            ''
          )}
        </span>
      </div>
      <div className="progress h-2">
        <div className="progress-bar" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

const Steps = ({
  status,
  onChange,
}: {
  status: number
  onChange?: (e: number) => void
}) => {
  const { t } = useTranslation()
  const { user, postData } = useTelegram()
  const [ageProgress, setAgeProgress] = useState(0)
  const [activeProgress, setActiveProgress] = useState(0)
  const [premiumProgress, setPremiumProgress] = useState(0)
  const [ogProgress, setOgProgress] = useState(0)
  const [homeProgress, setHomeProgress] = useState(0)
  const timer = useRef<any>(null)
  const homeTimer = useRef<any>(null)
  const dispatch = useAppDispatch()
  const [initLock, setInitLock] = useState(true)
  const lock = useRef<boolean>(false)
  const { telegramUserData, friendRank } = useAppSelector(state => state.user)
  const login = async () => {
    if (lock.current || !postData) return
    lock.current = true
    try {
      let result = await api.user.loginAPI(postData)

      sessionStorage.setItem(
        'token',
        (result.data && result.data.authToken) || ''
      )

      !result.data.isNewUser && (await initData())

      result.data.isNewUser && onChange && onChange(1)
      dispatch(updateNewUser(result.data && result.data.isNewUser))
    } catch (error) {
      console.log(error, 'error_')
    }
  }

  const homeProgressLoading = () => {
    if (homeTimer.current) return
    let value = homeProgress

    homeTimer.current = setInterval(() => {
      if (Object.keys(friendRank).length) {
        value = 100
        clearInterval(homeTimer.current)
      } else {
        if (value >= 99) {
          value = 99
        } else {
          value += 5
        }
      }
      setHomeProgress(value)
    }, 50)
  }
  useEffect(() => {
    homeProgressLoading()
  }, [])
  useEffect(() => {
    login()
  }, [])
  const loadPrigress = (
    progress: number,
    setProgress: (value: number) => void,
    isLast = false
  ) => {
    if (timer.current) return

    let value = progress

    timer.current = setInterval(() => {
      value += 3
      if (value >= 100) {
        if (!isLast) {
          clearInterval(timer.current)
          timer.current = null
          value = 100
        } else {
          console.log(initLock, 'initLockinitLock')

          if (initLock) {
            value >= 99 && (value = 99)
          } else {
            clearInterval(timer.current)
            timer.current = null
            value = 100
          }
        }
      }

      setProgress(value)
    }, 50)
  }
  useEffect(() => {
    if (status === 1) {
      if (!ageProgress) {
        initData()
        loadPrigress(ageProgress, setAgeProgress)
      }
      if (ageProgress === 100 && !activeProgress) {
        loadPrigress(activeProgress, setActiveProgress)
      }
      if (activeProgress === 100 && !premiumProgress) {
        loadPrigress(premiumProgress, setPremiumProgress)
      }
      if (premiumProgress === 100 && !ogProgress && !initLock) {
        loadPrigress(ogProgress, setOgProgress, true)
      }
    }
  }, [
    status,
    ageProgress,
    activeProgress,
    premiumProgress,
    ogProgress,
    initLock,
  ])

  const initData = async () => {
    if (!postData) return
    const reqls = [
      { name: 'userFun', callback: getUserFun, params: '' },
      { name: 'userRank', callback: api.user.userRankAPI, params: '' },
      { name: 'userReward', callback: api.user.userRewardAPI, params: '' },
      {
        name: 'inviteRank',
        callback: api.user.inviteRankAPI,
        params: {
          page: 1,
          pageSize: 500,
        },
      },
      {
        name: 'friendRank',
        callback: api.user.friendRankAPI,
        params: {
          page: 1,
          pageSize: 500,
        },
      },
      {
        name: 'bindPid',
        callback: api.user.findPidAPI,
        params: '',
      },
      {
        name: 'ercAddress',
        callback: api.user.findAddressAPI,
        params: {
          type: 'erc20',
        },
      },
      {
        name: 'solAddress',
        callback: api.user.findAddressAPI,
        params: {
          type: 'solana',
        },
      },
    ]

    const pReqls = reqls.map(item => {
      return new Promise(async (re, _) => {
        const result = item.params
          ? await item.callback(item.params as any)
          : await item.callback()

        if (result.success) {
          re({ name: item.name, result: result.data })
        } else {
          re({ name: item.name, result: null })
        }
      })
    })

    const results = await Promise.all(pReqls)
    const bindStatus: any = {}
    results.forEach((item: any) => {
      switch (item.name) {
        case 'userFun': {
          dispatch(updateTelegramUserData(item.result))
          break
        }
        case 'userRank': {
          dispatch(updateUserRank(item.result))
          break
        }
        case 'userReward': {
          const userReward = item.result
          let newArr: any = []
          userReward.activityLogs.forEach((item: any) => {
            if (!newArr.length) {
              newArr.push(item)
            } else {
              let obj = newArr.find((child: any) => child.key === item.key)
              if (!obj) {
                newArr.push(item)
              } else {
                obj.value = String(Number(obj.value) + Number(item.value))
              }
            }
          })
          userReward.activityLogs = newArr.filter((item: any) =>
            Number(item.value)
          )
          dispatch(updateUserReward(userReward))
          break
        }
        case 'inviteRank': {
          dispatch(updateInviteRank(item.result))
          break
        }
        case 'friendRank': {
          dispatch(updateFriendRank(item.result))
          break
        }
        case 'bindPid': {
          bindStatus.pid = item.result || null
          break
        }
        case 'ercAddress': {
          bindStatus.erc = item.result || null
          break
        }
        case 'solAddress': {
          bindStatus.sol = item.result || null
          break
        }

        default: {
          console.log('not found')

          break
        }
      }
    })
    dispatch(updateBindStatus(bindStatus))

    setInitLock(false)
  }

  const getUserFun = async () => {
    let result = await api.user.getUserAPI()
    if (result.data && result.data.predict_time === null) {
      result = await new Promise(reslove => {
        setTimeout(async () => {
          reslove(await getUserFun())
        }, 2000)
      })
    }

    return result
  }
  return (
    <>
      {status === 0 && (
        <div
          className="vh-100 grid gap-10 text-center p-4 justify-items-center w-full"
          style={{ gridAutoRows: '1fr auto auto' }}
        >
          <div
            className="self-center "
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyItems: 'center',
            }}
          >
            {/* <img src="/piwar.png" className="w-[20rem] h-[20rem]" /> */}
            <Loader />

            {!(postData && postData.initData) ? (
              <Text className="mt-4">{t('public.telegram.text')}</Text>
            ) : user?.username ? (
              <Text className="text-color">{t('steps.steps1.text1')}</Text>
            ) : (
              <Text className="text-color">{t('steps.steps1.text2')}</Text>
            )}
            <a
              className="w-full"
              href={t('public.telegram.url')}
              target="_blank"
            >
              {!(postData && postData.initData) ? (
                <Button>{t('public.telegram.bntText')}</Button>
              ) : (
                ''
              )}
            </a>
          </div>

          {user?.username ? (
            <div style={{ width: '100%' }}>
              <Progress value={homeProgress} icon={false} />
            </div>
          ) : (
            ''
          )}
        </div>
      )}
      {status === 1 && (
        <div
          className="vh-100 grid gap-10 text-center p-4 justify-items-center w-full"
          style={{ gridAutoRows: 'auto 1fr auto' }}
        >
          <Title className="!text-[2rem]">{t('steps.steps2.title')}</Title>
          <div className="grid gap-8 h-min w-full">
            <Progress text="Account Age Verified" value={ageProgress} />
            <Progress text="Activity Level Analyzed" value={activeProgress} />
            <Progress text="Telegram Premium Checked" value={premiumProgress} />
            <Progress text="Reply Permission Confirmed" value={ogProgress} />
          </div>
          <div class="!bg-black m-[-1rem]  w-full sticky bottom-0 z-1">
            {ageProgress === 100 &&
              premiumProgress === 100 &&
              activeProgress === 100 &&
              ogProgress === 100 && (
                <Button
                  className="w-100"
                  onClick={() => onChange && onChange(2)}
                >
                  Continue
                </Button>
              )}
          </div>
        </div>
      )}
      {status === 2 && (
        <div
          className="vh-100 grid gap-6 text-center p-4 justify-items-center"
          style={{ gridAutoRows: 'auto auto auto 1fr auto auto' }}
        >
          <div className="grid grid-cols-12 gap-3">
            <div
              className="h-1 bg-white col-span-6 rounded cursor-pointer"
              onClick={() => onChange && onChange(2)}
            />
            <div
              className="h-1 bg-white/50 col-span-6 rounded cursor-pointer"
              onClick={() => onChange && onChange(3)}
            />
          </div>
          <Title className="!text-[2rem]">{t('steps.steps3.title')}</Title>
          <Text>{t('steps.steps3.text1')}</Text>
          <div
            className="grid gap-0 self-center steps-3 w-full"
            style={{ gridAutoRows: '1fr auto' }}
          >
            <Title className=" !text-[9rem] self-center">
              {telegramUserData.predict_year ||
                getYearFromTimestamp(predictRegistrationDate(user?.id || 0))}
            </Title>
            <Text className="!text-[1.6rem] mt-[-1rem]">
              {t('steps.yearAgo')}
            </Text>
          </div>
          <Text className="whitespace-pre-line">
            {/* @ts-ignore */}
            {t('steps.steps3.text2', { returnObjects: true })?.[0]}{' '}
            {user?.id || ''}. {'\n'} {/* @ts-ignore */}
            {t('steps.steps3.text2', { returnObjects: true })?.[1].replace(
              '85',
              telegramUserData.userRank && telegramUserData.userRank.percentile
                ? Math.floor(
                    (telegramUserData.userRank &&
                      telegramUserData.userRank.percentile) ||
                      0
                  )
                : '85'
            )}
          </Text>
          <div class="!bg-black m-[-1rem]  w-full sticky bottom-0 z-1">
            <Button className="w-100" onClick={() => onChange && onChange(3)}>
              {t('steps.continue')}
            </Button>
          </div>
        </div>
      )}
      {status === 3 && (
        <div
          className="vh-100 grid gap-6 text-center p-4 justify-items-center"
          style={{ gridAutoRows: 'auto auto auto 1fr auto auto' }}
        >
          <div className="grid grid-cols-12 gap-3">
            <div
              className="h-1 bg-white col-span-6 rounded cursor-pointer"
              onClick={() => onChange && onChange(2)}
            />
            <div
              className="h-1 bg-white col-span-6 rounded cursor-pointer"
              onClick={() => onChange && onChange(3)}
            />
          </div>
          <Title className="!text-[2rem]">{t('steps.steps4.title')}</Title>
          <Text>{t('steps.steps4.text1')}</Text>
          <div
            className="grid gap-0 self-center steps-3 w-full justify-items-center"
            style={{ gridAutoRows: '1fr auto' }}
          >
            <div className="self-end z-1">
              <img src="/piwar.png" className="w-[13rem] h-[13rem]" />
            </div>
            <Text className="!text-[1.6rem]">
              {semicolon(telegramUserData.gold) || 0} PIS
            </Text>
          </div>
          <div className="whitespace-pre-line">{t('steps.steps4.text2')}</div>
          <div class="!bg-black m-[-1rem]  w-full sticky bottom-0 z-1">
            <Button
              className="w-100"
              onClick={() => {
                onChange && onChange(4)
                dispatch(updateNewUser(false))
              }}
            >
              {t('steps.continue')}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export function App() {
  const [transitionAnimation, setTransitionAnimation] = useState(true)
  const [currentPath, setCurrentPath] = useState('')
  const router = useRouter()
  const { isNewUser } = useAppSelector(state => state.user)
  const [stepsm, setSteps] = useState<number>(0)
  const { t } = useTranslation()

  // const opengraph: any = t('seo./.opengraph', { returnObjects: true })
  // const twitter: any = t('seo./.twitter', { returnObjects: true })

  useEffect(() => {
    if (router[0].path && router[0].path !== currentPath) {
      setCurrentPath(router[0].path)
      setTransitionAnimation(false)
    }
  }, [router, currentPath])

  useEffect(() => {
    if (!transitionAnimation) {
      const timer = setTimeout(() => {
        setTransitionAnimation(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [transitionAnimation])

  return (
    <Fragment>
      <Modals
        open={false}
        body={<Text>{t('public.updateText')}</Text>}
        title={<HeaderTitle>{t('public.update')}</HeaderTitle>}
      />
      {!isNewUser ? (
        <>
          <Box className={`overflow-hidden overflow-y-auto`}>
            <Header />
            <Message />
            <div
              className={`${
                transitionAnimation
                  ? 'transition-opacity duration-500 ease-in-out opacity-100'
                  : 'opacity-0'
              }`}
            >
              <RouterProvider />
            </div>
          </Box>
          <Navigation onClick={() => setTransitionAnimation(false)} />
        </>
      ) : (
        <Steps status={stepsm} onChange={e => setSteps(e)} />
      )}
    </Fragment>
  )
}
