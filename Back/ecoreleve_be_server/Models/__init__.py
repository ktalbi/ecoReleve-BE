from sqlalchemy.ext.declarative import declarative_base
import configparser
from sqlalchemy import select
from sqlalchemy.exc import TimeoutError
import pandas as pd
from traceback import print_exc
import os

AppConfig = configparser.ConfigParser()
absPath = os.path.abspath( os.path.join(os.path.dirname(__file__),'../../development.ini'))
AppConfig.read(absPath)
print(AppConfig['app:main']['sensor_schema'])

pendingSensorData = []
indivLocationData = []
stationData = []
graphDataDate = {'indivLocationData': None, 'pendingSensorData': None}
DBSession = None


class myBase(object):

    __table_args__ = {'implicit_returning': False}


Base = declarative_base(cls=myBase)
BaseExport = declarative_base()
dbConfig = {
    'data_schema': AppConfig['app:main']['data_schema'],
    'sensor_schema': AppConfig['app:main']['sensor_schema'],
    'cn.dialect': AppConfig['app:main']['cn.dialect'],
}

try:
    dbConfig['dbLog.schema'] = AppConfig['app:main']['dbLog.schema']
    dbConfig['dbLog.url'] = AppConfig['app:main']['dbLog.url']
except:
    print_exc()
    pass

DynPropNames = {
    'ProtocoleType': {
        'DynPropContextTable': 'ProtocoleType_ObservationDynProp',
        'DynPropTable': 'ObservationDynProp',
        'FKToDynPropTable': 'FK_ObservationDynProp'
    }
}


thesaurusDictTraduction = {}
invertedThesaurusDict = {'en': {}, 'fr': {}}
userOAuthDict = {}


def loadThesaurusTrad(config):
    session = config.registry.dbmaker()
    if 'ERDThesaurusTerm' in Base.metadata.tables:
        thesTable = Base.metadata.tables['ERDThesaurusTerm']
        query = select(thesTable.c)

        results = session.execute(query).fetchall()

        for row in results:
            newTraduction = {
                'en': row['nameEn'], 'fr': row['nameFr'], 'parentID': row['parentID']}
            if thesaurusDictTraduction.get(row['fullPath'], None):
                thesaurusDictTraduction[row['fullPath']].append(newTraduction)
        
            else:
                thesaurusDictTraduction[row['fullPath']] = [newTraduction]
            invertedThesaurusDict['en'][row['nameEn']] = row['fullPath']
            invertedThesaurusDict['fr'][row['nameFr']] = row['fullPath']
        session.close()


def loadUserRole(session):
    global userOAuthDict
    # session = config.registry.dbmaker()
    # VuserRole = Base.metadata.tables['VUser_Role']
    # query = select(VuserRole.c)

    # results = session.execute(query).fetchall()
    # userOAuthDict = pd.DataFrame.from_records(
    #     results, columns=['user_id', 'role_id'])


USERS = {'Super Utilisateur': 'superUser',
         'Utilisateur': 'user',
         'Administrateur': 'admin',
         'Client': 'client'}

GROUPS = {'superUser': ['group:superUser'],
          'user': ['group:user'],
          'admin': ['group:admin'],
          'client': ['group:client']}


def groupfinder(userid, request):
    roles = request.authenticated_userid['app_roles']
    ecoreleve_role = roles.get('ecoreleve', None)
    return GROUPS.get(USERS.get(ecoreleve_role, None), [])


def cache_callback(request, session):
    if isinstance(request.exception, TimeoutError):
        session.get_bind().dispose()


from ..GenericObjets.Business import *
import json


def db(request):
    makerDefault = request.registry.dbmaker
    session = makerDefault()

    def cleanup(request):
        if request.exception is not None:
            session.rollback()
            cache_callback(request, session)
            session.close()
            makerDefault.remove()
        else:
            try:
                session.commit()
            except BusinessRuleError as e:
                session.rollback()
                request.response.status_code = 409
                request.response.text = e.value
            except Exception as e:
                print_exc()
                session.rollback()
                request.response.status_code = 500
            finally:
                session.close()
                makerDefault.remove()

    request.add_finished_callback(cleanup)
    return session


from ..GenericObjets.FrontModules import *
from .CustomTypes import *
from .Client import *
from .Project import *
from .Protocoles import *
from .User import User
from .Station import *
from .Region import *
from .FieldActivity import *
from .Individual import *
from .Sensor import *
from .MonitoredSite import *
from .Equipment import *
from .Import import *
from .SensorData import *
from .List import *
from .Log import sendLog
from .MediasFiles import *
