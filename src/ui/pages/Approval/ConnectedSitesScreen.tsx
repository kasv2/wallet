/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';

import { ConnectedSite } from '@/background/service/permission';
import { Card, Column, Content, Header, Icon, Image, Layout, Row, Text } from '@/ui/components';
import { Empty } from '@/ui/components/Empty';
import { fontSizes } from '@/ui/theme/font';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';

export default function ConnectedSitesScreen() {
  const wallet = useWallet();
  const { t } = useTranslation();

  const [sites, setSites] = useState<ConnectedSite[]>([]);

  const getSites = async () => {
    const sites = await wallet.getConnectedSites();
    setSites(sites);
  };

  useEffect(() => {
    getSites();
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    getSites();
  };
  return (
    <Layout>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
        title={t('Connected Sites')}
      />
      <Content>
        <Column>
          {sites.length > 0 ? (
            sites.map((item, index) => {
              return (
                <Card key={item.origin}>
                  <Row full justifyBetween itemsCenter>
                    <Row itemsCenter>
                      <Image src={item.icon} size={fontSizes.logo} />
                      <Text text={item.origin} preset="sub" />
                    </Row>
                    <Column justifyCenter>
                      <Icon
                        icon="close"
                        onClick={() => {
                          handleRemove(item.origin);
                        }}
                      />
                    </Column>
                  </Row>
                </Card>
              );
            })
          ) : (
            <Empty />
          )}
        </Column>
      </Content>
    </Layout>
  );
}
