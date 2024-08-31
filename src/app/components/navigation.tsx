import { useState } from "react";
import { route, useRouter } from "preact-router";
import BottomNavigation from "@material-ui/core/BottomNavigation";
import BottomNavigationAction from "@material-ui/core/BottomNavigationAction";
import { useTranslation } from "react-i18next";
import Icon from "@/components/icon";
import lang from "@/config/locale";
import { baseRoutes } from "@/config/route";

export default function Navigation({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const navs: any = t("nav", { returnObjects: true });
  const data = [
    {
      icon: <Icon name="home" className="!w-6 !h-6 mb-1" />,
      name: navs[0],
      path: "/",
    },
    {
      icon: <Icon name="ranking" className="!w-6 !h-6 mb-1" />,
      name: navs[1],
      path: "/leaderboard",
    },
    {
      icon: <Icon name="game" className="!w-6 !h-6 mb-1" />,
      name: navs[4],
      path: "/game",
    },
    {
      icon: <Icon name="friends" className="!w-6 !h-6 mb-1" />,
      name: navs[2],
      path: "/friends",
    },
    {
      icon: <Icon name="rocket" className="!w-6 !h-6 mb-1" />,
      name: navs[3],
      path: "/airdrops",
    },
  ];

  // 生成多语言支持的路由
  const localizedRoutes = data.map((route) => ({
    ...route,
    path: `/:lang(${Object.keys(lang).join("|")})${route.path}`,
  }));

  const [value, setValue] = useState(getPathWithoutLang(router[0].path));

  // 获取路径中的语言部分
  function getPathWithoutLang(path: any) {
    const parts = path.split("/");
    return "/" + parts.slice(2).join("/");
  }

  return (
    <BottomNavigation
      value={value}
      onChange={(_event, newValue) => {
        const filteredValue = getPathWithoutLang(newValue);
        route(filteredValue, true);
        setValue(filteredValue);
        onClick && onClick();
      }}
      showLabels
      className="!bg-[#16213C]"
    >
      {localizedRoutes.map((itme, index) => {
        return (
          baseRoutes[index].status && (
            <BottomNavigationAction
              key={index}
              label={itme.name}
              value={itme.path}
              icon={itme.icon}
              className={`!text-white ${
                value === getPathWithoutLang(itme.path)
                  ? "opacity-100"
                  : "opacity-50"
              } !min-w-[auto] p-0`}
            />
          )
        );
      })}
    </BottomNavigation>
  );
}
